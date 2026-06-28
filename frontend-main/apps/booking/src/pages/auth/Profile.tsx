import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Upload, X, Download } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg, PixelCrop } from "../../utils/cropImage";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { IMAGES } from "../../assets";
import SingleDatePicker from "../../common/DatePicker";
import { Button } from "../../common/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../common/ui/form";
import { Input } from "../../common/ui/input";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { getLocalStorageValue, storeLocallyWithExpiry } from "../../lib/utils";
import { UpdateProfileImage, updateUserData } from "../../store/auth/authActions";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  phone: z.string().min(1, { message: "Phone is required" }),
  dob: z.string(),
  country: z.string().min(1, { message: "Country is required" }),
});
const imageFormSchema = z.object({
  image: z.any().refine((data) => data instanceof File, {
    message: "Image is required",
  }),
});

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [isEditableImage, setIsEditableImage] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [inputValue, setInputValue] = useState("");

  const user = getLocalStorageValue("user");
  const isUserLoggedIn = getLocalStorageValue("isLoggedIn")
    ? getLocalStorageValue("isLoggedIn")
    : false;
  const [isLoggedIn] = useState(isUserLoggedIn);

  const defaultImageUrl = user?.photo
    ? `${backendUrl}${user.photo}`
    : IMAGES.africanGirlProfile;
  const [imageUrl, setImageUrl] = useState(defaultImageUrl);
  const [originalImageUrl, setOriginalImageUrl] = useState(defaultImageUrl);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerOffset, setViewerOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);

  // Close on ESC when viewer open
  useEffect(() => {
    if (!showImageViewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowImageViewer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showImageViewer]);

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownload = async () => {
    const name = selectedImageName || "profile-image.jpg";
    try {
      if (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")) {
        // Directly download object/data URLs
        triggerDownload(imageUrl, name);
        return;
      }
      // Fetch cross-origin and download as blob
      const res = await fetch(imageUrl, { mode: "cors", credentials: "omit" });
      if (!res.ok) throw new Error("Failed to fetch image");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, name);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Last fallback: attempt direct download of original URL
      triggerDownload(imageUrl, name);
    }
  };

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const onViewerWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const next = clamp(viewerZoom + (e.deltaY < 0 ? 0.1 : -0.1), 1, 5);
    setViewerZoom(parseFloat(next.toFixed(2)));
  };

  const onViewerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Avoid hijacking clicks on controls
    if (target && (target.closest('[data-viewer-control="true"]') || target.closest('button'))) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    isPanningRef.current = true;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    // Prevent default only when starting pan so buttons still receive clicks
    e.preventDefault();
  };

  const onViewerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current || !lastPointRef.current) return;
    const dx = e.clientX - lastPointRef.current.x;
    const dy = e.clientY - lastPointRef.current.y;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    setViewerOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const onViewerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false;
    lastPointRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user ? user.firstName : "Guest",
      lastName: user ? user.lastName : "Guest",
      phone: user ? user.phone : "",
      dob: user ? user.dob : "",
      country: user ? user.country : "",
    },
  });

  const imageForm = useForm<z.infer<typeof imageFormSchema>>({
    resolver: zodResolver(imageFormSchema),
    defaultValues: {
      image: undefined,
    },
  });
console.log(user);
  const onSubmitProfile = async (data: any) => {
    try {
      setLoading(true);
      dispatch(updateUserData(data) as any);
      setIsEditable(false);
      setLoading(false);
    } catch (error) {
      // Handle errors
    } finally {
      setLoading(false);
    }
  };

  const onSubmitImage = async (data: z.infer<typeof imageFormSchema>) => {
    try {
      setLoading(true);
      const newData = { userId: user?._id ?? "", photo: data.image };
      const photo = await dispatch(UpdateProfileImage(newData) as any);
      if (photo) {
        const newUrl = `${backendUrl}${photo}`;
        setImageUrl(newUrl);
        setOriginalImageUrl(newUrl);
        // revoke any previous preview object URL
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      }
      setIsEditableImage(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (event: any) => {
    const selectedImage = event.target.files[0];

    if (selectedImage) {
      imageForm.setValue("image", selectedImage);
      imageForm.clearErrors("image");
      // create a local preview URL
      try {
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        const preview = URL.createObjectURL(selectedImage);
        previewUrlRef.current = preview;
        setImageUrl(preview);
        setSelectedImageName(selectedImage.name || "image.jpg");
        setShowCropper(true);
      } catch (e) {
        // no-op on preview errors
      }
    }
  };

  const onCropComplete = (_: any, croppedPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const applyCrop = async () => {
    if (!croppedAreaPixels) {
      setShowCropper(false);
      return;
    }
    try {
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels, 0);
      const name = selectedImageName || "avatar.jpg";
      const type = blob.type || "image/jpeg";
      const file = new File([blob], name, { type });
      imageForm.setValue("image", file);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const newPreview = URL.createObjectURL(file);
      previewUrlRef.current = newPreview;
      setImageUrl(newPreview);
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply crop");
    } finally {
      setShowCropper(false);
    }
  };

  const cancelCrop = () => {
    // revert preview to original image and clear selection
    setImageUrl(originalImageUrl);
    imageForm.setValue("image", undefined as any);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setShowCropper(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
  };

  useEffect(() => {
    return () => {
      // cleanup preview URL on unmount
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user || !isLoggedIn) {
      toast.error("Please login before continue to profile!", {
        duration: 6000,
      });
      storeLocallyWithExpiry("redirectPath", "/profile");
      navigate("/login");
    }
    if (user.dob) {
      const dateObj = new Date(user.dob);
      setSelectedDate(dateObj);
      setInputValue(dateObj.toLocaleDateString());
    }
  }, []);

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-270 mt-5 ml-5 mr-5">
        <Breadcrumb pageName="Profile Settings" />

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-transparent">
              <div className="flex justify-between border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Personal Information
                </h3>
                {!isEditable && (
                  <Button variant={"ghost"} onClick={() => setIsEditable(true)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <div className="p-7">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitProfile)}>
                    <div className="mb-5.5 flex flex-col gap-5 sm:grid grid-cols-2">
                      <FormField
                        name="firstName"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name:</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="first name"
                                {...field}
                                disabled={!isEditable}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="lastName"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name:</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="last name"
                                {...field}
                                disabled={!isEditable}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="phone"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className="hideIncrementor">
                            <FormLabel>Phone:</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="phone"
                                {...field}
                                disabled={!isEditable}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="dob"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Birth Date:</FormLabel>
                            <FormControl>
                              <SingleDatePicker
                                placeholder="Select departure date"
                                setInputValue={setInputValue}
                                setSelectedDate={setSelectedDate}
                                inputValue={inputValue}
                                selectedDate={selectedDate}
                                monthsShown={1}
                                minDate={null}
                                maxDate={new Date()}
                                className={`py-4 dark:bg-slate-900 ${
                                  isEditable
                                    ? "focus-visible:ring-1"
                                    : "focus-visible:ring-0"
                                }`}
                                onChange={(date: Date) =>
                                {
                                  form.setValue(
                                    "dob",
                                    date.toISOString()
                                  );
                                  setInputValue(date.toLocaleDateString());
                                  setSelectedDate(date);
                                }
                                }
                                isDisabled={!isEditable}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="country"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className="col-span-1">
                            <FormLabel>Country:</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Country name"
                                {...field}
                                disabled={!isEditable}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {isEditable && (
                      <div className="flex justify-end gap-4 mt-5">
                        <Button
                          type="button"
                          variant={"ghost"}
                          onClick={() => setIsEditable(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-600"
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </div>
            </div>
          </div>
          <div className="col-span-5 xl:col-span-2">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-transparent">
              <div className="flex justify-between border-b border-stroke py-4 px-7 dark:border-strokedark">
                <h3 className="font-medium text-black dark:text-white">
                  Your Photo
                </h3>
                {!isEditableImage && (
                  <Button
                    variant={"ghost"}
                    onClick={() => {
                      setOriginalImageUrl(imageUrl);
                      setIsEditableImage(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <div className="p-7">
                <Form {...imageForm}>
                  <form onSubmit={imageForm.handleSubmit(onSubmitImage)}>
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className="h-14 w-14 rounded-full overflow-hidden border border-stroke"
                        onClick={() => setShowImageViewer(true)}
                        title="Click to view"
                      >
                        <img src={imageUrl} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="mb-1.5 text-black dark:text-white">
                          Edit your photo
                        </span>
                        <span className="flex gap-2">
                          <FormField
                            name="image"
                            control={imageForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <label htmlFor="upload-button">
                                    <div
                                      className={`text-sm hover:text-primary p-2 ${
                                        !isEditableImage &&
                                        "opacity-50 pointer-events-none"
                                      }`}
                                    >
                                      <div className="flex items-center">
                                        <Upload className="h-3 w-3  mr-1" />
                                        <span className="text-sm">Update</span>
                                      </div>
                                    </div>
                                    <Input
                                      id="upload-button"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleImageChange}
                                      style={{ display: "none" }}
                                      disabled={!isEditableImage}
                                    />
                                  </label>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </span>
                      </div>
                    </div>

                    {isEditableImage && (
                      <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                        <Button
                          type="button"
                          variant={"ghost"}
                          onClick={() => {
                            // revert to original image and clear selection
                            setImageUrl(originalImageUrl);
                            imageForm.setValue("image", undefined as any);
                            if (previewUrlRef.current) {
                              URL.revokeObjectURL(previewUrlRef.current);
                              previewUrlRef.current = null;
                            }
                            setIsEditableImage(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-600"
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCropper && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
            <div className="relative flex-1">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                rotation={0}
                aspect={1}
                cropSize={{ width: 400, height: 400 }}
                zoomWithScroll={true}
                minZoom={1}
                maxZoom={4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4">
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={cancelCrop}>
                  Cancel
                </Button>
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-600" onClick={applyCrop}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showImageViewer && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm p-4"
          onClick={() => setShowImageViewer(false)}
        >
          <div
            className="relative w-full max-w-5xl h-[80vh] rounded-lg overflow-hidden bg-black/20"
            onClick={(e) => e.stopPropagation()}
            onWheel={onViewerWheel}
            onPointerDown={onViewerPointerDown}
            onPointerMove={onViewerPointerMove}
            onPointerUp={onViewerPointerUp}
            onPointerCancel={onViewerPointerUp}
            style={{ cursor: isPanningRef.current ? "grabbing" : viewerZoom > 1 ? "grab" : "auto" }}
          >
            <img
              src={imageUrl}
              alt="Profile preview"
              className="absolute top-1/2 left-1/2 max-w-none select-none"
              style={{
                transform: `translate(${viewerOffset.x}px, ${viewerOffset.y}px) translate(-50%, -50%) scale(${viewerZoom})`,
                userSelect: "none",
              }}
              draggable={false}
            />
            <div className="absolute top-3 right-3 flex gap-2" data-viewer-control="true">
              <button
                type="button"
                onClick={handleDownload}
                title="Download"
                className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg ring-1 ring-black/5 hover:bg-white dark:bg-slate-800/90 dark:text-white"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowImageViewer(false)}
                title="Close"
                className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg ring-1 ring-black/5 hover:bg-white dark:bg-slate-800/90 dark:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
};

export default Profile;