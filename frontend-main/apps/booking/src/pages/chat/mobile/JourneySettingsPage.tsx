/**
 * Journey Settings Page
 *
 * Professional settings page for the journey experience:
 * - Personal profile management
 * - Home location with "set current location" support
 * - Per-journey budget preferences
 * - UI color theme customization (3 curated palettes)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Cropper from "react-easy-crop";
import { getCroppedImg, PixelCrop } from "../../../utils/cropImage";
import {
  ArrowLeft,
  User,
  MapPin,
  Wallet,
  Palette,
  Save,
  Check,
  Loader2,
  Navigation,
  Home,
  ChevronRight,
  Globe,
  Phone,
  Mail,
  Calendar,
  Camera,
  X,
  FileText,
  Plane,
  Shield,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Settings,
  KeyRound,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../../store/auth/authSlice";
import { getLocalStorageValue, storeLocallyWithExpiry, removeLocalStorageValue } from "../../../lib/utils";
import { cookies } from "../../..";
import { IMAGES } from "../../../assets";

const backendUrl =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";
const fastApiBackendUrl = process.env.REACT_APP_AI_BACKEND_URL
// ─── Theme Definitions ──────────────────────────────────────────────────────

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;       // HSL for --primary
    border: string;        // HSL for --border
    input: string;         // HSL for --input
    ring: string;          // HSL for --ring
    destructiveFg: string; // HSL for --destructive-foreground
  };
  preview: {
    primary: string;   // hex for visual preview swatch
    accent: string;    // hex secondary swatch
    highlight: string; // hex tertiary swatch
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "emerald-voyage",
    name: "Emerald Voyage",
    description: "Fresh and natural — the classic Umoja green",
    colors: {
      primary: "145 47% 50%",
      border: "144 71% 85%",
      input: "144 71% 85%",
      ring: "145 47% 50%",
      destructiveFg: "145 25% 95%",
    },
    preview: {
      primary: "#2dcc6f",
      accent: "#a7f3d0",
      highlight: "#065f46",
    },
  },
  {
    id: "ocean-depths",
    name: "Ocean Depths",
    description: "Calm and sophisticated — deep sea tranquility",
    colors: {
      primary: "213 72% 52%",
      border: "213 60% 85%",
      input: "213 60% 85%",
      ring: "213 72% 52%",
      destructiveFg: "213 25% 95%",
    },
    preview: {
      primary: "#2b7de9",
      accent: "#bfdbfe",
      highlight: "#1e3a5f",
    },
  },
  {
    id: "sunset-amber",
    name: "Sunset Amber",
    description: "Warm and inviting — golden hour energy",
    colors: {
      primary: "25 85% 55%",
      border: "25 70% 85%",
      input: "25 70% 85%",
      ring: "25 85% 55%",
      destructiveFg: "25 25% 95%",
    },
    preview: {
      primary: "#e8783a",
      accent: "#fed7aa",
      highlight: "#7c2d12",
    },
  },
  {
    id: "royal-violet",
    name: "Royal Violet",
    description: "Bold and luxurious — first-class elegance",
    colors: {
      primary: "271 69% 55%",
      border: "271 50% 85%",
      input: "271 50% 85%",
      ring: "271 69% 55%",
      destructiveFg: "271 25% 95%",
    },
    preview: {
      primary: "#8b5cf6",
      accent: "#ddd6fe",
      highlight: "#3b0764",
    },
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    description: "Refined and warm — timeless sophistication",
    colors: {
      primary: "346 77% 60%",
      border: "346 55% 88%",
      input: "346 55% 88%",
      ring: "346 77% 60%",
      destructiveFg: "346 25% 95%",
    },
    preview: {
      primary: "#e84d8a",
      accent: "#fce7f3",
      highlight: "#831843",
    },
  },
];

const BUDGET_STORAGE_KEY = "umoja_journey_budget";
const HOME_LOCATION_STORAGE_KEY = "umoja_home_location";
const THEME_STORAGE_KEY = "umoja_theme_preference";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStoredThemeId(): string {
  try {
    const themeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (themeId) return themeId;
    const user = getLocalStorageValue("user") as any;
    if (user?.themePreference) return user.themePreference;
  } catch { /* ignore */ }
  return "emerald-voyage";
}

function getStoredBudget(): { min: number; max: number; currency: string } {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { min: 500, max: 3000, currency: "USD" };
}

function getStoredHomeLocation(): {
  lat: number | null;
  lon: number | null;
  city: string;
  country: string;
  address: string;
} {
  try {
    const raw = localStorage.getItem(HOME_LOCATION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lat: null, lon: null, city: "", country: "", address: "" };
}

function getMaskedSensitiveNumber(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";

  const visibleDigits = normalized.slice(-3);
  const maskedLength = Math.max(normalized.length - visibleDigits.length, 3);

  return `${"*".repeat(maskedLength)}${visibleDigits}`;
}

function isMaskedSensitiveValue(value: string): boolean {
  return value.includes("*");
}

function buildTravelDocsState(docs: any) {
  return {
    passportNumber: docs?.passportNumber || "",
    passportExpiry: docs?.passportExpiry ? new Date(docs.passportExpiry).toISOString().split("T")[0] : "",
    passportIssuingCountry: docs?.passportIssuingCountry || "",
    nationality: docs?.nationality || "",
    nationalIdNumber: docs?.nationalIdNumber || "",
    frequentFlyerNumber: docs?.frequentFlyerNumber || "",
    frequentFlyerAirline: docs?.frequentFlyerAirline || "",
  };
}

/** Apply a theme preset to the document's CSS custom properties. */
export function applyTheme(preset: ThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--primary", preset.colors.primary);
  root.style.setProperty("--border", preset.colors.border);
  root.style.setProperty("--input", preset.colors.input);
  root.style.setProperty("--ring", preset.colors.ring);
  root.style.setProperty("--destructive-foreground", preset.colors.destructiveFg);
}

/** Load and apply the stored theme on app boot. */
export function initializeTheme() {
  const id = getStoredThemeId();
  const preset = THEME_PRESETS.find((t) => t.id === id);
  if (preset) applyTheme(preset);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface JourneySettingsPageProps {
  onBack?: () => void;
  initialSection?: SettingsSection;
}

export type SettingsSection = "profile" | "documents" | "location" | "budget" | "theme" | "security" | "preferences";

const SETTINGS_NAV_ITEMS: Array<{
  id: SettingsSection;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}> = [
  {
    id: "profile",
    title: "Profile",
    subtitle: "Identity and contact details",
    icon: <User className="h-4 w-4" />,
  },
  {
    id: "documents",
    title: "Documents",
    subtitle: "Passport and travel records",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "location",
    title: "Location",
    subtitle: "Home airport and address",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    id: "budget",
    title: "Budget",
    subtitle: "Trip spend preferences",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    id: "theme",
    title: "Theme",
    subtitle: "Look and feel",
    icon: <Palette className="h-4 w-4" />,
  },
  {
    id: "preferences",
    title: "Preferences",
    subtitle: "Monitoring behavior",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: "security",
    title: "Security",
    subtitle: "Password and 2FA",
    icon: <Lock className="h-4 w-4" />,
  },
];

const JourneySettingsPage: React.FC<JourneySettingsPageProps> = ({ onBack, initialSection }) => {
  const user = getLocalStorageValue("user") as any;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Auth guard: redirect to login if session is invalid
  useEffect(() => {
    const loggedIn = getLocalStorageValue("isLoggedIn");
    const token = getLocalStorageValue("token");
    const isAuthenticated =
      loggedIn === true ||
      loggedIn === "true" ||
      (typeof token === "string" && !!token && token !== "undefined" && token !== "null");

    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/journey/settings" } }, replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    initializeTheme();
  }, []);

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [country, setCountry] = useState(user?.country || "");
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob).toISOString().split("T")[0] : "");
  const [gender, setGender] = useState(user?.gender || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.photo || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [pendingFileName, setPendingFileName] = useState("avatar.jpg");

  // Travel documents state
  type TravelDocsState = {
    passportNumber: string;
    passportExpiry: string;
    passportIssuingCountry: string;
    nationality: string;
    nationalIdNumber: string;
    frequentFlyerNumber: string;
    frequentFlyerAirline: string;
  };
  type RevealableTravelDocField = "passportNumber" | "nationalIdNumber";
  const [travelDocs, setTravelDocs] = useState<TravelDocsState>(() => {
    const docs = user?.travelDocuments;
    return buildTravelDocsState(docs);
  });
  const [docsSaving, setDocsSaving] = useState(false);
  const [isEditingPassportNumber, setIsEditingPassportNumber] = useState(false);
  const [isEditingNationalIdNumber, setIsEditingNationalIdNumber] = useState(false);
  const [revealField, setRevealField] = useState<RevealableTravelDocField | null>(null);
  const [revealPassword, setRevealPassword] = useState("");
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealedFieldValue, setRevealedFieldValue] = useState("");
  const [showRevealPassword, setShowRevealPassword] = useState(false);
  const [revealTwoFactorCode, setRevealTwoFactorCode] = useState("");

  // Security / password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    Boolean(user?.security?.twoFactorEnabled || user?.twoFactorEnabled)
  );
  const [twoFactorEnabledAt, setTwoFactorEnabledAt] = useState<string | null>(
    user?.security?.twoFactorEnabledAt || user?.twoFactorEnabledAt || null
  );
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false);
  const [twoFactorConfirmLoading, setTwoFactorConfirmLoading] = useState(false);
  const [twoFactorDisableLoading, setTwoFactorDisableLoading] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState("");
  const [twoFactorManualKey, setTwoFactorManualKey] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disableTwoFactorCode, setDisableTwoFactorCode] = useState("");

  type HomeLocationState = { lat: number | null; lon: number | null; city: string; country: string; address: string };
  type BudgetState = { min: number; max: number; currency: string };

  // Location state — prefer DB data from user object, fall back to localStorage
  const [homeLocation, setHomeLocation] = useState<HomeLocationState>(() => {
    if (user?.homeLocation?.city || user?.homeLocation?.address) return user.homeLocation;
    return getStoredHomeLocation();
  });
  const [locatingCurrent, setLocatingCurrent] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);

  // Budget state — prefer DB data from user object, fall back to localStorage
  const [budget, setBudget] = useState<BudgetState>(() => {
    if (user?.budgetPreference?.currency) return user.budgetPreference;
    return getStoredBudget();
  });
  const [budgetSaved, setBudgetSaved] = useState(false);

  // Theme state — prefer DB data from user object, fall back to localStorage
  const [activeTheme, setActiveTheme] = useState(() => {
    if (user?.themePreference) return user.themePreference;
    return getStoredThemeId();
  });

  const [monitoringPreference, setMonitoringPreference] = useState<'all' | 'active' | 'off'>(
    user?.journeyMonitoringPreference || 'off'
  );
  const [prefSaving, setPrefSaving] = useState(false);

  // Active section for mobile accordion
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>(initialSection || "profile");

  const getAuthHeaders = useCallback(() => {
    const token = getLocalStorageValue("token") as string;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const syncStoredUser = useCallback((nextUserData: any) => {
    const current = (getLocalStorageValue("user") as any) || {};
    storeLocallyWithExpiry("user", { ...current, ...nextUserData });
  }, []);

  // ── Photo Upload with Cropper ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Create preview URL and open cropper
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;
    setCropperImage(preview);
    setPendingFileName(file.name || "avatar.jpg");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setShowCropper(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onCropComplete = (_: any, croppedPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const cancelCrop = () => {
    setShowCropper(false);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCropperImage("");
    setCroppedAreaPixels(null);
  };

  const applyCropAndUpload = async () => {
    const userId = user?._id || user?.id;
    if (!userId) {
      toast.error("User not found");
      return;
    }

    setShowCropper(false);
    setPhotoUploading(true);

    try {
      let fileToUpload: File;

      if (croppedAreaPixels) {
        const blob = await getCroppedImg(cropperImage, croppedAreaPixels, 0);
        fileToUpload = new File([blob], pendingFileName, { type: blob.type || "image/jpeg" });
      } else {
        // No crop applied — use original file as-is
        const resp = await fetch(cropperImage);
        const blob = await resp.blob();
        fileToUpload = new File([blob], pendingFileName, { type: blob.type || "image/jpeg" });
      }

      const formData = new FormData();
      formData.append("photo", fileToUpload);

      const token = getLocalStorageValue("token") as string;
      const res = await fetch(`${backendUrl}/api/client/user/avatar/${userId}/photo`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const newPhotoPath = data?.data?.clientUser?.photo;
        if (newPhotoPath) {
          setPhotoUrl(newPhotoPath);
          const current = getLocalStorageValue("user") as any;
          storeLocallyWithExpiry("user", { ...current, photo: newPhotoPath });
        }
        toast.success("Profile photo updated");
      } else {
        toast.error(data?.message || "Failed to upload photo");
      }
    } catch {
      toast.error("Failed to process image");
    } finally {
      setPhotoUploading(false);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setCropperImage("");
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  // ── Profile ──

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/updateMe`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ firstName, lastName, phone, country, dob: dob || undefined, gender: gender || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        const current = getLocalStorageValue("user") as any;
        const updated = { ...current, firstName, lastName, phone, country, dob, gender };
        storeLocallyWithExpiry("user", updated);
        toast.success("Profile updated");
      } else {
        toast.error(data?.message || "Failed to update profile");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Location ──

  const handleSetCurrentLocation = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported");
      return;
    }

    setLocatingCurrent(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const { latitude: lat, longitude: lon } = pos.coords;

      // Reverse geocode via Node server
      const geoRes = await fetch(
        `${backendUrl}/api/location/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
      );
      const geoData = geoRes.ok ? await geoRes.json() : null;

      const newLoc = {
        lat,
        lon,
        city: geoData?.city || "",
        country: geoData?.address?.country || "",
        address: geoData?.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      };

      setHomeLocation(newLoc);

      // Auto-save to DB
      const saveRes = await fetch(`${backendUrl}/api/client/user/updateMe`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ homeLocation: newLoc }),
      });
      if (saveRes.ok) {
        const current = getLocalStorageValue("user") as any;
        storeLocallyWithExpiry("user", { ...current, homeLocation: newLoc });
      }
      toast.success("Home location set to your current position");
    } catch (err: any) {
      if (err?.code === 1) {
        toast.error("Location permission denied");
      } else {
        toast.error("Failed to get location");
      }
    } finally {
      setLocatingCurrent(false);
    }
  };

  const handleLocationSave = async () => {
    setLocationSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/updateMe`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ homeLocation }),
      });
      const data = await res.json();
      if (res.ok) {
        const current = getLocalStorageValue("user") as any;
        storeLocallyWithExpiry("user", { ...current, homeLocation });
        toast.success("Home location saved");
      } else {
        toast.error(data?.message || "Failed to save location");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLocationSaving(false);
    }
  };

  // ── Travel Documents ──

  const togglePassportEdit = () => {
    if (isEditingPassportNumber) {
      const currentUser = getLocalStorageValue("user") as any;
      setTravelDocs((prev) => ({ ...prev, passportNumber: currentUser?.travelDocuments?.passportNumber || "" }));
      setIsEditingPassportNumber(false);
      return;
    }

    setTravelDocs((prev) => ({
      ...prev,
      passportNumber: isMaskedSensitiveValue(prev.passportNumber) ? "" : prev.passportNumber,
    }));
    setIsEditingPassportNumber(true);
  };

  const toggleNationalIdEdit = () => {
    if (isEditingNationalIdNumber) {
      const currentUser = getLocalStorageValue("user") as any;
      setTravelDocs((prev) => ({ ...prev, nationalIdNumber: currentUser?.travelDocuments?.nationalIdNumber || "" }));
      setIsEditingNationalIdNumber(false);
      return;
    }

    setTravelDocs((prev) => ({
      ...prev,
      nationalIdNumber: isMaskedSensitiveValue(prev.nationalIdNumber) ? "" : prev.nationalIdNumber,
    }));
    setIsEditingNationalIdNumber(true);
  };

  const openRevealModal = (field: "passportNumber" | "nationalIdNumber") => {
    setRevealField(field);
    setRevealPassword("");
    setRevealTwoFactorCode("");
    setRevealedFieldValue("");
    setShowRevealPassword(false);
  };

  const closeRevealModal = () => {
    setRevealField(null);
    setRevealPassword("");
    setRevealTwoFactorCode("");
    setRevealedFieldValue("");
    setShowRevealPassword(false);
  };

  const handleRevealSensitiveField = async () => {
    if (!revealField) return;
    if (!revealPassword) {
      toast.error("Please enter your password");
      return;
    }
    if (twoFactorEnabled && revealTwoFactorCode.length !== 6) {
      toast.error("Please enter your authenticator code");
      return;
    }

    setRevealLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/revealSensitiveDocument`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          field: revealField,
          password: revealPassword,
          twoFactorCode: twoFactorEnabled ? revealTwoFactorCode : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedFieldValue(data?.data?.value || "");
      } else {
        toast.error(data?.message || "Failed to reveal document");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRevealLoading(false);
    }
  };

  const handleDocsSave = async () => {
    setDocsSaving(true);
    try {
      const nextTravelDocuments: any = {
        passportExpiry: travelDocs.passportExpiry || null,
        passportIssuingCountry: travelDocs.passportIssuingCountry,
        nationality: travelDocs.nationality,
        frequentFlyerNumber: travelDocs.frequentFlyerNumber,
        frequentFlyerAirline: travelDocs.frequentFlyerAirline,
      };

      if (isEditingPassportNumber || !isMaskedSensitiveValue(travelDocs.passportNumber)) {
        nextTravelDocuments.passportNumber = travelDocs.passportNumber;
      }

      if (isEditingNationalIdNumber || !isMaskedSensitiveValue(travelDocs.nationalIdNumber)) {
        nextTravelDocuments.nationalIdNumber = travelDocs.nationalIdNumber;
      }

      const payload = {
        travelDocuments: nextTravelDocuments,
      };
      const res = await fetch(`${backendUrl}/api/client/user/updateMe`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const current = getLocalStorageValue("user") as any;
        const savedTravelDocuments = data?.data?.travelDocuments || payload.travelDocuments;
        const nextState = buildTravelDocsState(savedTravelDocuments);
        setTravelDocs(nextState);
        storeLocallyWithExpiry("user", { ...current, travelDocuments: savedTravelDocuments });
        setIsEditingPassportNumber(false);
        setIsEditingNationalIdNumber(false);
        toast.success("Travel documents saved");
      } else {
        toast.error(data?.message || "Failed to save documents");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDocsSaving(false);
    }
  };

  // ── Security / Password ──

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/updatePassword`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          passwordCurrent: currentPassword,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Update token from response
        if (data?.token) {
          storeLocallyWithExpiry("token", data.token);
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success("Password updated successfully");
      } else {
        toast.error(data?.message || "Failed to update password");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── Budget ──

  const closeTwoFactorModal = () => {
    setTwoFactorModalOpen(false);
    setTwoFactorQrCode("");
    setTwoFactorManualKey("");
    setTwoFactorCode("");
  };

  const handleBeginTwoFactorSetup = async () => {
    setTwoFactorSetupLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/2fa/setup`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (res.ok) {
        setTwoFactorQrCode(data?.data?.qrCodeDataUrl || "");
        setTwoFactorManualKey(data?.data?.manualEntryKey || "");
        setTwoFactorCode("");
        setTwoFactorModalOpen(true);
      } else {
        toast.error(data?.message || "Failed to start two-factor setup");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTwoFactorSetupLoading(false);
    }
  };

  const handleConfirmTwoFactorSetup = async () => {
    if (!twoFactorCode.trim()) {
      toast.error("Enter the authenticator code to continue");
      return;
    }

    setTwoFactorConfirmLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/2fa/confirm`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: twoFactorCode }),
      });
      const data = await res.json();

      if (res.ok) {
        setTwoFactorEnabled(true);
        setTwoFactorEnabledAt(data?.data?.security?.twoFactorEnabledAt || new Date().toISOString());
        syncStoredUser(data?.data);
        closeTwoFactorModal();
        toast.success("Two-factor authentication enabled");
      } else {
        toast.error(data?.message || "Failed to verify authenticator code");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTwoFactorConfirmLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!disableTwoFactorCode.trim()) {
      toast.error("Enter your current authenticator code");
      return;
    }

    setTwoFactorDisableLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/2fa/disable`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: disableTwoFactorCode }),
      });
      const data = await res.json();

      if (res.ok) {
        setTwoFactorEnabled(false);
        setTwoFactorEnabledAt(null);
        setDisableTwoFactorCode("");
        syncStoredUser(data?.data);
        toast.success("Two-factor authentication disabled");
      } else {
        toast.error(data?.message || "Failed to disable two-factor authentication");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTwoFactorDisableLoading(false);
    }
  };

  const handleBudgetSave = async () => {
    setBudgetSaved(false);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/updateMe`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ budgetPreference: budget }),
      });
      const data = await res.json();
      if (res.ok) {
        const current = getLocalStorageValue("user") as any;
        storeLocallyWithExpiry("user", { ...current, budgetPreference: budget });
        setBudgetSaved(true);
        toast.success("Budget preferences saved");
        setTimeout(() => setBudgetSaved(false), 2000);
      } else {
        toast.error(data?.message || "Failed to save budget");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // ── Theme ──

  const handleThemeSelect = async (preset: ThemePreset) => {
    setActiveTheme(preset.id);
    applyTheme(preset);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preset.id);
    } catch { /* ignore */ }
    try {
      await fetch(`${backendUrl}/api/client/user/updateMe`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ themePreference: preset.id }),
      });
      const current = getLocalStorageValue("user") as any;
      storeLocallyWithExpiry("user", { ...current, themePreference: preset.id });
    } catch { /* theme applied locally even if DB save fails */ }
    toast.success(`Theme changed to ${preset.name}`);
  };

  const handlePreferenceSave = async (pref: 'all' | 'active' | 'off') => {
    setMonitoringPreference(pref);
    setPrefSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/user/updateMe`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ journeyMonitoringPreference: pref }),
      });
      if (res.ok) {
        const current = getLocalStorageValue("user") as any;
        storeLocallyWithExpiry("user", { ...current, journeyMonitoringPreference: pref });
        toast.success("Preferences saved");

        // Notify FastAPI backend of the preference change for global loop control
        try {
          await fetch(`${fastApiBackendUrl}/api/ai/monitoring/preference`, {
            method: 'POST',
            headers: {
              ...getAuthHeaders()
            },
            body: JSON.stringify({
              user_id: user?._id || user?.id,
              journeyMonitoringPreference: pref
            })
          });
        } catch (err) {
          console.error("Failed to notify FastAPI of monitoring preference change", err);
        }
      } else {
        toast.error("Failed to save preferences");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setPrefSaving(false);
    }
  };

  // Section toggle
  const toggleSection = (section: SettingsSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const sectionHeader = (
    section: SettingsSection,
    icon: React.ReactNode,
    title: string,
    subtitle: string
  ) => (
    <button
      onClick={() => toggleSection(section)}
      className="flex w-full items-center justify-between px-5 py-4 text-left"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={sectionIconStyle}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      <ChevronRight
        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expandedSection === section ? "rotate-90" : ""
          }`}
      />
    </button>
  );

  const getSectionOrder = (section: SettingsSection, defaultOrder: number) =>
    expandedSection === section ? -1 : defaultOrder;

  const currentThemePreset =
    THEME_PRESETS.find((preset) => preset.id === activeTheme) || THEME_PRESETS[0];
  const themePrimary = currentThemePreset.preview.primary;
  const themeAccent = currentThemePreset.preview.accent;
  const themeHighlight = currentThemePreset.preview.highlight;
  const pageBackgroundStyle = {
    backgroundImage: `radial-gradient(circle at top, ${themeAccent}55, transparent 34%), linear-gradient(180deg, #f8fafc 0%, ${themeAccent}35 46%, #f8fafc 100%)`,
  };
  const sidebarStyle = {
    backgroundImage: `linear-gradient(155deg, ${themeHighlight}, ${themePrimary}E6 55%, ${themeHighlight})`,
    boxShadow: `0 25px 80px -32px ${themeHighlight}88`,
  };
  const activeDesktopTabStyle = {
    backgroundColor: themeHighlight,
    borderColor: themeHighlight,
    boxShadow: `0 18px 40px -24px ${themeHighlight}66`,
  };
  const activeSidebarNavStyle = {
    backgroundColor: `${themeAccent}22`,
    borderColor: `${themeAccent}44`,
    boxShadow: `0 18px 30px -24px ${themeHighlight}88`,
  };
  const activeSidebarNavIconStyle = {
    backgroundColor: "#ffffff",
    color: themeHighlight,
  };
  const sectionIconStyle = {
    backgroundColor: themeHighlight,
    boxShadow: `0 14px 30px -18px ${themeHighlight}99`,
  };

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 lg:px-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Journey Control</p>
            <h1 className="text-base font-semibold text-slate-950">Settings</h1>
            <p className="text-[11px] text-slate-500">Refine your profile, travel data, and protection layers</p>
          </div>
        </div>
        <div className="mx-auto hidden w-full max-w-7xl px-4 pb-3 lg:block lg:px-6">
          <div className="flex flex-wrap gap-2">
            {SETTINGS_NAV_ITEMS.map((item) => {
              const isActive = expandedSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExpandedSection(item.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "border-white/80 bg-white/75 text-slate-600 hover:bg-slate-100"
                  }`}
                  style={isActive ? activeDesktopTabStyle : undefined}
                >
                  {item.icon}
                  {item.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-20 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-6">
        {/* ── Profile Avatar (always visible) ───────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.03 }}
          className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(155deg,_rgba(6,78,59,0.98),_rgba(4,47,46,0.96)_52%,_rgba(15,23,42,0.96))] px-5 py-5 text-white shadow-[0_25px_80px_-32px_rgba(4,47,46,0.72)] lg:sticky lg:top-28 lg:px-6 lg:py-6"
          style={sidebarStyle}
        >
          <div className="flex items-start gap-4">
            <div className="flex gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[28px] border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  {photoUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <img
                      src={photoUrl ? `${backendUrl}${photoUrl}` : IMAGES.africanGirlProfile}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1.5 right-0.5 z-10 flex h-7 w-7 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-xl border border-white/60 bg-white/30 text-primary shadow-md shadow-slate-950/15 backdrop-blur-sm"
                >
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <div className="pt-1">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-medium text-white/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium account setup
                </div>
                <p className="text-xl font-semibold">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Your Name"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[12px] text-white/75">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email || "No email"}
                </p>
                <p className="mt-1 text-[11px] text-white/60">
                  Keep every journey ready for booking, support, and secure access.
                </p>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="mt-5 grid w-full grid-cols-3 gap-3">
            <div className="rounded-3xl border border-emerald-100/10 bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Profile</p>
              <p className="mt-2 text-sm font-semibold">{phone ? "Ready" : "Needs info"}</p>
            </div>
            <div className="rounded-3xl border border-emerald-100/10 bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Documents</p>
              <p className="mt-2 text-sm font-semibold">{travelDocs.passportNumber ? "Stored" : "Pending"}</p>
            </div>
            <div className="rounded-3xl border border-emerald-100/10 bg-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Protection</p>
              <p className="mt-2 text-sm font-semibold">{twoFactorEnabled ? "Verified" : "Upgrade"}</p>
            </div>
          </div>

          <div className="mt-5 hidden space-y-2 lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45">Workspace Navigation</p>
            {SETTINGS_NAV_ITEMS.map((item) => {
              const isActive = expandedSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExpandedSection(item.id)}
                  className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-all ${
                    isActive
                      ? "border-emerald-100/20 bg-white/16 text-white shadow-lg"
                      : "border-emerald-100/10 bg-white/8 text-white/75 hover:bg-white/12"
                  }`}
                  style={isActive ? activeSidebarNavStyle : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isActive ? "bg-white text-slate-900" : "bg-white/10 text-white"}`}
                      style={isActive ? activeSidebarNavIconStyle : undefined}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className={`text-[11px] ${isActive ? "text-white/70" : "text-white/45"}`}>{item.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? "rotate-90 text-white" : "text-white/45"}`} />
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="space-y-4 lg:flex lg:flex-col lg:gap-4 lg:space-y-0">

        {/* ── Profile Section ─────────────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{ order: getSectionOrder("profile", 1) }}
        >
          {sectionHeader("profile", <User className="h-4 w-4 text-primary" />, "Personal Information", "Manage your profile details")}

          {expandedSection === "profile" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3"
            >
              {/* Form fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="h-3 w-3" /> Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {profileSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Profile</>
                )}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Legal Documents Section ─────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.075 }}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{ order: getSectionOrder("documents", 2) }}
        >
          {sectionHeader("documents", <FileText className="h-4 w-4 text-primary" />, "Travel Documents", "Passport & ID for flight bookings")}

          {expandedSection === "documents" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3"
            >
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  Your passport and national ID stay masked until you confirm your password to reveal them.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="text-[11px] font-medium text-muted-foreground block">Passport Number</label>
                    {travelDocs.passportNumber && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openRevealModal("passportNumber")}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Reveal passport number"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={togglePassportEdit}
                          className="text-[10px] font-medium text-primary hover:opacity-80 transition-opacity"
                        >
                          {isEditingPassportNumber ? "Keep current" : "Update"}
                        </button>
                      </div>
                    )}
                  </div>

                  {travelDocs.passportNumber && !isEditingPassportNumber ? (
                    <div className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/40 text-foreground">
                      {getMaskedSensitiveNumber(travelDocs.passportNumber)}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={travelDocs.passportNumber}
                      onChange={(e) => setTravelDocs((prev) => ({ ...prev, passportNumber: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow uppercase tracking-wider"
                      placeholder="AB1234567"
                    />
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Passport Expiry</label>
                  <input
                    type="date"
                    value={travelDocs.passportExpiry}
                    onChange={(e) => setTravelDocs((prev) => ({ ...prev, passportExpiry: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Issuing Country</label>
                  <input
                    type="text"
                    value={travelDocs.passportIssuingCountry}
                    onChange={(e) => setTravelDocs((prev) => ({ ...prev, passportIssuingCountry: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Nationality</label>
                  <input
                    type="text"
                    value={travelDocs.nationality}
                    onChange={(e) => setTravelDocs((prev) => ({ ...prev, nationality: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="Nationality"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="text-[11px] font-medium text-muted-foreground block">National ID Number</label>
                  {travelDocs.nationalIdNumber && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openRevealModal("nationalIdNumber")}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Reveal national ID number"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={toggleNationalIdEdit}
                        className="text-[10px] font-medium text-primary hover:opacity-80 transition-opacity"
                      >
                        {isEditingNationalIdNumber ? "Keep current" : "Update"}
                      </button>
                    </div>
                  )}
                </div>
                {travelDocs.nationalIdNumber && !isEditingNationalIdNumber ? (
                  <div className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/40 text-foreground">
                    {getMaskedSensitiveNumber(travelDocs.nationalIdNumber)}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={travelDocs.nationalIdNumber}
                    onChange={(e) => setTravelDocs((prev) => ({ ...prev, nationalIdNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="Optional"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Plane className="h-3 w-3" /> Frequent Flyer #
                  </label>
                  <input
                    type="text"
                    value={travelDocs.frequentFlyerNumber}
                    onChange={(e) => setTravelDocs((prev) => ({ ...prev, frequentFlyerNumber: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow uppercase tracking-wider"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Plane className="h-3 w-3" /> Airline
                  </label>
                  <input
                    type="text"
                    value={travelDocs.frequentFlyerAirline}
                    onChange={(e) => setTravelDocs((prev) => ({ ...prev, frequentFlyerAirline: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="e.g. Ethiopian Airlines"
                  />
                </div>
              </div>

              <button
                onClick={handleDocsSave}
                disabled={docsSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {docsSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Travel Documents</>
                )}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Home Location Section ───────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{ order: getSectionOrder("location", 3) }}
        >
          {sectionHeader("location", <MapPin className="h-4 w-4 text-primary" />, "Home Location", "Set your departure home address")}

          {expandedSection === "location" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3"
            >
              {/* Current home display */}
              {homeLocation.city || homeLocation.address ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Home className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {homeLocation.city || "Home"}
                      {homeLocation.country ? `, ${homeLocation.country}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {homeLocation.address}
                    </p>
                    {homeLocation.lat && homeLocation.lon && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {homeLocation.lat.toFixed(4)}, {homeLocation.lon.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No home location set</p>
                </div>
              )}

              {/* Set current location button */}
              <button
                onClick={handleSetCurrentLocation}
                disabled={locatingCurrent}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                {locatingCurrent ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Detecting location...</>
                ) : (
                  <><Navigation className="h-4 w-4" /> Set My Current Location as Home</>
                )}
              </button>

              {/* Manual entry */}
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground">Or enter manually</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={homeLocation.city}
                    onChange={(e) => setHomeLocation((prev) => ({ ...prev, city: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={homeLocation.country}
                    onChange={(e) => setHomeLocation((prev) => ({ ...prev, country: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    placeholder="Country"
                  />
                </div>
                <input
                  type="text"
                  value={homeLocation.address}
                  onChange={(e) => setHomeLocation((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  placeholder="Full address"
                />
              </div>

              <button
                onClick={handleLocationSave}
                disabled={locationSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {locationSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Home Location</>
                )}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Budget Section ───────────────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{ order: getSectionOrder("budget", 4) }}
        >
          {sectionHeader("budget", <Wallet className="h-4 w-4 text-primary" />, "Journey Budget", "Set estimated budget per journey")}

          {expandedSection === "budget" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-4"
            >
              {/* Budget preview */}
              <div className="flex items-center justify-center gap-2 py-3">
                <span className="text-2xl font-bold text-primary">
                  {budget.currency === "USD" ? "$" : budget.currency}{budget.min.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">—</span>
                <span className="text-2xl font-bold text-primary">
                  {budget.currency === "USD" ? "$" : budget.currency}{budget.max.toLocaleString()}
                </span>
              </div>

              {/* Currency selector */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Currency</label>
                <select
                  value={budget.currency}
                  onChange={(e) => setBudget((prev) => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ETB">ETB (Br)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="NGN">NGN (₦)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>

              {/* Min budget slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Minimum Budget</label>
                  <span className="text-[11px] font-semibold text-foreground">${budget.min.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={budget.min}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBudget((prev) => ({ ...prev, min: val, max: Math.max(prev.max, val + 100) }));
                  }}
                  className="w-full h-1.5 rounded-full appearance-none bg-border accent-primary cursor-pointer"
                />
              </div>

              {/* Max budget slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Maximum Budget</label>
                  <span className="text-[11px] font-semibold text-foreground">${budget.max.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={25000}
                  step={100}
                  value={budget.max}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBudget((prev) => ({ ...prev, max: val, min: Math.min(prev.min, val - 100) }));
                  }}
                  className="w-full h-1.5 rounded-full appearance-none bg-border accent-primary cursor-pointer"
                />
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Budget", min: 200, max: 800 },
                  { label: "Mid-range", min: 800, max: 3000 },
                  { label: "Premium", min: 3000, max: 8000 },
                  { label: "Luxury", min: 8000, max: 25000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setBudget((prev) => ({ ...prev, min: preset.min, max: preset.max }))}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${budget.min === preset.min && budget.max === preset.max
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleBudgetSave}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {budgetSaved ? (
                  <><Check className="h-4 w-4" /> Saved!</>
                ) : (
                  <><Save className="h-4 w-4" /> Save Budget Preferences</>
                )}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Theme Section ────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{ order: getSectionOrder("theme", 5) }}
        >
          {sectionHeader("theme", <Palette className="h-4 w-4 text-primary" />, "Color Theme", "Customize your journey dashboard")}

          {expandedSection === "theme" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3"
            >
              <p className="text-[11px] text-muted-foreground">
                Choose a color palette that suits your style. This changes the accent colors throughout your journey dashboard.
              </p>

              {THEME_PRESETS.map((preset) => {
                const isActive = activeTheme === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleThemeSelect(preset)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${isActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{preset.name}</h4>
                          {isActive && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              <Check className="h-3 w-3" /> Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{preset.description}</p>
                      </div>

                      {/* Color swatches */}
                      <div className="flex items-center gap-1 ml-3">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: preset.preview.primary }}
                        />
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm -ml-2"
                          style={{ backgroundColor: preset.preview.accent }}
                        />
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm -ml-2"
                          style={{ backgroundColor: preset.preview.highlight }}
                        />
                      </div>
                    </div>

                    {/* Live preview bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <div
                        className="h-2 flex-1 rounded-full"
                        style={{ backgroundColor: preset.preview.primary }}
                      />
                      <div
                        className="h-2 w-12 rounded-full"
                        style={{ backgroundColor: preset.preview.accent }}
                      />
                      <div
                        className="h-2 w-6 rounded-full"
                        style={{ backgroundColor: preset.preview.highlight }}
                      />
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* ── Preferences Section ─────────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{ order: getSectionOrder("preferences", 6) }}
        >
          {sectionHeader("preferences", <Settings className="h-4 w-4 text-primary" />, "Preferences", "Journey monitoring & experience")}

          {expandedSection === "preferences" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-4"
            >
              <div className="space-y-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Background Monitoring</p>
                <div className="space-y-2">
                  <button
                    onClick={() => handlePreferenceSave('all')}
                    disabled={prefSaving}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${monitoringPreference === 'all'
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-border/80 bg-background"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${monitoringPreference === 'all' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">Monitor All Journeys</p>
                        <p className="text-[10px] text-muted-foreground">Get updates for every journey in your list</p>
                      </div>
                    </div>
                    {monitoringPreference === 'all' && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handlePreferenceSave('active')}
                    disabled={prefSaving}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${monitoringPreference === 'active'
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-border/80 bg-background"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${monitoringPreference === 'active' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Navigation className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">Active Journey Only</p>
                        <p className="text-[10px] text-muted-foreground">Only monitor the journey you're currently viewing</p>
                      </div>
                    </div>
                    {monitoringPreference === 'active' && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => handlePreferenceSave('off')}
                    disabled={prefSaving}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${monitoringPreference === 'off'
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-border/80 bg-background"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${monitoringPreference === 'off' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <EyeOff className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">Monitoring Off</p>
                        <p className="text-[10px] text-muted-foreground">Disable background journey monitoring</p>
                      </div>
                    </div>
                    {monitoringPreference === 'off' && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── Security Section ──────────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.225 }}
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
          style={{ order: getSectionOrder("security", 7) }}
        >
          {sectionHeader("security", <Lock className="h-4 w-4 text-primary" />, "Security", "Passwords, authenticator app, and account hardening")}

          {expandedSection === "security" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-5 px-4 pb-5"
            >
              <div className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">Two-factor authentication</p>
                    <h4 className="mt-1 text-sm font-semibold text-slate-950">
                      {twoFactorEnabled ? "Authenticator protection is active" : "Secure this account with an authenticator app"}
                    </h4>
                    <p className="mt-1 text-[12px] text-slate-600">
                      {twoFactorEnabled
                        ? "Every password sign-in will require a live verification code from your phone."
                        : "Scan a real QR code with Google Authenticator, Microsoft Authenticator, Authy, or 1Password."}
                    </p>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-xs font-semibold ${twoFactorEnabled ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"}`}>
                    {twoFactorEnabled ? "Enabled" : "Recommended"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/80 bg-white/80 p-3">
                    <div className="mb-2 flex items-center gap-2 text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs font-semibold">Status</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{twoFactorEnabled ? "Protected" : "Not enabled"}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {twoFactorEnabledAt ? `Enabled ${new Date(twoFactorEnabledAt).toLocaleDateString()}` : "Turn on stronger sign-in verification"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/80 p-3">
                    <div className="mb-2 flex items-center gap-2 text-slate-700">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs font-semibold">Authenticator apps</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">Google, Microsoft, Authy</p>
                    <p className="mt-1 text-[11px] text-slate-500">Scan once, then enter the 6-digit code shown on your phone.</p>
                  </div>
                </div>

                {!twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={handleBeginTwoFactorSetup}
                    disabled={twoFactorSetupLoading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {twoFactorSetupLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Preparing QR code...</>
                    ) : (
                      <><Shield className="h-4 w-4" /> Enable Two-Factor Authentication</>
                    )}
                  </button>
                ) : (
                  <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white/85 p-3">
                    <label className="block text-[11px] font-medium text-slate-500">Enter current authenticator code to disable</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={disableTwoFactorCode}
                      onChange={(e) => setDisableTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tracking-[0.28em] text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="123456"
                    />
                    <button
                      type="button"
                      onClick={handleDisableTwoFactor}
                      disabled={twoFactorDisableLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                    >
                      {twoFactorDisableLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Disabling...</>
                      ) : (
                        <><Shield className="h-4 w-4" /> Disable Two-Factor Authentication</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Password management</p>
                    <h4 className="mt-1 text-sm font-semibold text-slate-950">Update your sign-in password</h4>
                    <p className="mt-1 text-[12px] text-slate-500">Use a strong unique password before or after enabling your authenticator app.</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <KeyRound className="h-4 w-4" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring/50"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring/50"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring/50 ${
                      confirmPassword && confirmPassword !== newPassword ? "border-destructive" : "border-border"
                    }`}
                    placeholder="Re-enter new password"
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1 text-[10px] text-destructive">Passwords do not match</p>
                  )}
                </div>

                <button
                  onClick={handlePasswordChange}
                  disabled={passwordSaving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {passwordSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
                  ) : (
                    <><Lock className="h-4 w-4" /> Update Password</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── Logout ────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ order: 98 }}
        >
          <button
            onClick={() => {
              dispatch(logout() as any);
              removeLocalStorageValue("isLoggedIn");
              removeLocalStorageValue("user");
              removeLocalStorageValue("redirectPath");
              removeLocalStorageValue("token");
              cookies.remove("token");
              navigate("/login", { replace: true });
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </motion.div>

        {/* Version info */}
        <div className="text-center pt-4 pb-8 lg:pt-2" style={{ order: 99 }}>
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Umoja Journey Control Suite</p>
          <p className="mt-1 text-[10px] text-slate-400/80">v1.0</p>
        </div>
        </div>
      </div>

      {/* ── Cropper Modal ──────────────────────────────────────────── */}
      {revealField && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Reveal {revealField === "passportNumber" ? "Passport Number" : "National ID Number"}
                </h3>
                <p className="text-[11px] text-muted-foreground">Confirm your password to continue</p>
              </div>
              <button
                type="button"
                onClick={closeRevealModal}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/40 text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showRevealPassword ? "text" : "password"}
                    value={revealPassword}
                    onChange={(e) => setRevealPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRevealPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showRevealPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {twoFactorEnabled && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Authenticator Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={revealTwoFactorCode}
                    onChange={(e) => setRevealTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground tracking-[0.28em] focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    placeholder="123456"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Your account has 2FA enabled, so the current authenticator code is also required.</p>
                </div>
              )}

              {revealedFieldValue && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Decrypted Value</label>
                  <input
                    type="text"
                    readOnly
                    value={revealedFieldValue}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/40 text-foreground"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleRevealSensitiveField}
                disabled={revealLoading || !revealPassword || (twoFactorEnabled && revealTwoFactorCode.length !== 6)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {revealLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Proceeding...</>
                ) : (
                  <><Eye className="h-4 w-4" /> Proceed</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {twoFactorModalOpen && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-sm overflow-hidden rounded-[32px] border border-white/15 bg-white shadow-[0_35px_90px_-40px_rgba(15,23,42,0.65)]">
            <div className="bg-[linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(5,150,105,0.9))] px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">Authenticator Setup</p>
                  <h3 className="mt-1 text-base font-semibold">Scan your QR code</h3>
                  <p className="mt-1 text-[12px] text-white/75">Use your phone, then enter the 6-digit code generated by the app.</p>
                </div>
                <button
                  type="button"
                  onClick={closeTwoFactorModal}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                {twoFactorQrCode ? (
                  <img src={twoFactorQrCode} alt="Two-factor authentication QR code" className="mx-auto h-56 w-56 rounded-2xl bg-white p-3 shadow-sm" />
                ) : (
                  <div className="flex h-56 items-center justify-center rounded-2xl bg-white text-sm text-slate-500">QR code unavailable</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-medium text-slate-500">Manual setup key</p>
                <p className="mt-1 break-all font-mono text-[13px] text-slate-950">{twoFactorManualKey || "Not available"}</p>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">Authenticator code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-base tracking-[0.38em] text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="123456"
                />
              </div>

              <button
                type="button"
                onClick={handleConfirmTwoFactorSetup}
                disabled={twoFactorConfirmLoading || twoFactorCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {twoFactorConfirmLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  <><Check className="h-4 w-4" /> Verify and Enable</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropper && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-background/90 border-b border-border">
            <button
              onClick={cancelCrop}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
            <h3 className="text-sm font-semibold text-foreground">Crop Photo</h3>
            <button
              onClick={applyCropAndUpload}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
          </div>

          {/* Cropper area */}
          <div className="relative flex-1">
            <Cropper
              image={cropperImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              zoomWithScroll={true}
              minZoom={1}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom slider */}
          <div className="px-8 py-4 bg-background/90 border-t border-border">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none bg-border accent-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneySettingsPage;
