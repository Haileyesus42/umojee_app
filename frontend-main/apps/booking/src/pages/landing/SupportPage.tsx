import { FileText, Loader2, MessageSquare, Paperclip, RefreshCw, Send, TicketPlus, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { Button } from "../../common/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../common/ui/card";
import { Input } from "../../common/ui/input";
import { Textarea } from "../../common/ui/textarea";
import DefaultLayout from "../../layout/DefaultLayout";
import { getLocalStorageValue, storeLocallyWithExpiry } from "../../lib/utils";

const backendUrl = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");

const createTicketSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
  category: z.enum([
    "bug",
    "feature_request",
    "account",
    "booking",
    "payment",
    "general",
  ]),
  priority: z.enum(["low", "medium", "high"]),
});

const replySchema = z.object({
  message: z.string().trim().min(1).max(4000),
});

type TicketSummary = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  latestMessagePreview: string;
  conversationCount: number;
  assignedTo: null | {
    name: string;
  };
};

type TicketDetail = TicketSummary & {
  description: string;
  closedAt?: string | null;
  conversations: Array<{
    id: string;
    senderType: "client" | "admin";
    senderName: string;
    senderEmail: string;
    message: string;
    attachments: string[];
    createdAt: string;
  }>;
  events: Array<{
    action: string;
    actorType: string;
    actorName: string;
    message: string;
    createdAt: string;
  }>;
};

type TicketListResponse = {
  items: TicketSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

const statusTone: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-sky-100 text-sky-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-700",
};

const priorityTone: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-rose-100 text-rose-700",
};

const formatLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const buildAuthorizedUrl = (value: string) => {
  if (value.startsWith("http")) {
    return value;
  }

  if (backendUrl.endsWith("/api") && value.startsWith("/api/")) {
    return `${backendUrl}${value.slice(4)}`;
  }

  return `${backendUrl}${value}`;
};

const formatFileName = (value: string) => {
  const cleanValue = value.split("?")[0];
  return cleanValue.substring(cleanValue.lastIndexOf("/") + 1);
};

const SupportPage = () => {
  const navigate = useNavigate();
  const { ticketId: routeTicketId } = useParams<{ ticketId?: string }>();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketMeta, setTicketMeta] = useState<TicketListResponse>({
    items: [],
    page: 1,
    limit: 3,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [filters, setFilters] = useState({ status: "all", category: "all" });
  const [replyMessage, setReplyMessage] = useState("");
  const [newTicketFiles, setNewTicketFiles] = useState<File[]>([]);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium",
  });

  const token = getLocalStorageValue("token") as string | null;
  const user = getLocalStorageValue("user");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  const loadTickets = async (preferredId?: string, pageOverride?: number) => {
    if (!token) return;

    setLoadingList(true);
    try {
      const targetPage = pageOverride || ticketPage;
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", "3");
      params.set("sort", "-lastMessageAt");
      if (filters.status !== "all") {
        params.set("status", filters.status);
      }
      if (filters.category !== "all") {
        params.set("category", filters.category);
      }

      const response = await fetch(
        `${backendUrl}/api/client/support-tickets?${params.toString()}`,
        {
          headers: authHeaders,
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load support tickets");
      }

      const listData = payload.data as TicketListResponse;
      const items = listData.items || [];
      setTickets(items);
      setTicketPage(listData.page || targetPage);
      setTicketMeta({
        items,
        page: listData.page || targetPage,
        limit: listData.limit || 3,
        total: listData.total || 0,
        totalPages: Math.max(listData.totalPages || 1, 1),
        hasNextPage: Boolean(listData.hasNextPage),
      });

      const nextSelectedId =
        preferredId ||
        routeTicketId ||
        (selectedTicketId && items.find((item) => item.id === selectedTicketId)?.id) ||
        items[0]?.id ||
        "";

      setSelectedTicketId(nextSelectedId);
      if (nextSelectedId && nextSelectedId !== routeTicketId) {
        navigate(`/support/${nextSelectedId}`, { replace: true });
      }
      if (!nextSelectedId && routeTicketId) {
        navigate("/support", { replace: true });
      }
      if (!items.length) {
        setSelectedTicket(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Unable to load support tickets");
    } finally {
      setLoadingList(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    if (!token || !ticketId) return;

    setLoadingDetail(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/client/support-tickets/${ticketId}`,
        {
          headers: authHeaders,
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load ticket detail");
      }

      setSelectedTicket(payload.data as TicketDetail);
    } catch (error: any) {
      toast.error(error.message || "Unable to load ticket detail");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!user || !token) {
      toast.error("Please login to access support.");
      storeLocallyWithExpiry("redirectPath", "/support");
      navigate("/login");
      return;
    }
  }, [navigate, token, user]);

  useEffect(() => {
      if (token) {
      loadTickets(undefined, ticketPage);
    }
  }, [ticketPage, token]);

  useEffect(() => {
    setTicketPage(1);
  }, [filters.category, filters.status]);

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    if (routeTicketId && routeTicketId !== selectedTicketId) {
      setSelectedTicketId(routeTicketId);
    }
  }, [routeTicketId, selectedTicketId]);

  const openTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    navigate(`/support/${ticketId}`);
  };

  const submitNewTicket = async () => {
    const parsed = createTicketSchema.safeParse(newTicket);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid ticket details");
      return;
    }

    setCreatingTicket(true);
    try {
      const formData = new FormData();
      formData.append("title", parsed.data.title);
      formData.append("description", parsed.data.description);
      formData.append("category", parsed.data.category);
      formData.append("priority", parsed.data.priority);
      newTicketFiles.forEach((file) => formData.append("attachments", file));

      const response = await fetch(`${backendUrl}/api/client/support-tickets`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to create support ticket");
      }

      const createdTicket = payload.data as TicketDetail;
      setNewTicket({
        title: "",
        description: "",
        category: "general",
        priority: "medium",
      });
      setNewTicketFiles([]);
      setShowNewTicketForm(false);
      toast.success("Support ticket created");
      await loadTickets(createdTicket.id, 1);
      await loadTicketDetail(createdTicket.id);
    } catch (error: any) {
      toast.error(error.message || "Unable to create support ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const submitReply = async () => {
    if (!selectedTicket) return;

    const parsed = replySchema.safeParse({ message: replyMessage });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Reply cannot be empty");
      return;
    }

    setSendingReply(true);
    try {
      const formData = new FormData();
      formData.append("message", parsed.data.message);
      replyFiles.forEach((file) => formData.append("attachments", file));

      const response = await fetch(
        `${backendUrl}/api/client/support-tickets/${selectedTicket.id}/conversations`,
        {
          method: "POST",
          headers: authHeaders,
          body: formData,
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to send reply");
      }

      setReplyMessage("");
      setReplyFiles([]);
      setSelectedTicket(payload.data as TicketDetail);
      await loadTickets(selectedTicket.id, ticketPage);
      toast.success("Reply sent");
    } catch (error: any) {
      toast.error(error.message || "Unable to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleNewTicketFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTicketFiles(Array.from(event.target.files || []).slice(0, 5));
  };

  const handleReplyFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReplyFiles(Array.from(event.target.files || []).slice(0, 5));
  };

  const removeNewTicketFile = (fileName: string) => {
    setNewTicketFiles((current) => current.filter((file) => file.name !== fileName));
  };

  const removeReplyFile = (fileName: string) => {
    setReplyFiles((current) => current.filter((file) => file.name !== fileName));
  };

  const reopenTicket = async () => {
    if (!selectedTicket) return;

    try {
      const response = await fetch(
        `${backendUrl}/api/client/support-tickets/${selectedTicket.id}/reopen`,
        {
          method: "PATCH",
          headers: authHeaders,
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to reopen ticket");
      }

      setSelectedTicket(payload.data as TicketDetail);
      await loadTickets(selectedTicket.id, ticketPage);
      toast.success("Ticket reopened");
    } catch (error: any) {
      toast.error(error.message || "Unable to reopen ticket");
    }
  };

  return (
    <DefaultLayout>
      <div className="mx-auto mt-5 max-w-screen-2xl px-5 pb-10">
        {/* <Breadcrumb pageName="Support" /> */}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <TicketPlus className="h-5 w-5 text-emerald-600" />
                    New Support Ticket
                  </CardTitle>
                  {showNewTicketForm ? (
                    <button
                      type="button"
                      onClick={() => setShowNewTicketForm(false)}
                      className="text-xs font-normal text-blue-500 transition hover:text-slate-800"
                    >
                      Hide
                    </button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewTicketForm ? (
                  <>
                    <Input
                      value={newTicket.title}
                      onChange={(event) =>
                        setNewTicket((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Brief subject"
                    />
                    <Textarea
                      value={newTicket.description}
                      onChange={(event) =>
                        setNewTicket((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Describe the issue or request"
                      className="min-h-[120px]"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm appearance-none"
                        value={newTicket.category}
                        onChange={(event) =>
                          setNewTicket((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                      >
                        <option value="general">General</option>
                        <option value="booking">Booking</option>
                        <option value="payment">Payment</option>
                        <option value="account">Account</option>
                        <option value="bug">Bug</option>
                        <option value="feature_request">Feature Request</option>
                      </select>
                      <select
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm appearance-none"
                        value={newTicket.priority}
                        onChange={(event) =>
                          setNewTicket((current) => ({
                            ...current,
                            priority: event.target.value,
                          }))
                        }
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <Paperclip className="h-4 w-4 text-emerald-600" />
                        Attach files
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleNewTicketFileChange}
                        />
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Add images, PDFs, documents, or screenshots. Up to 5 files.
                      </p>
                      {newTicketFiles.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {newTicketFiles.map((file) => (
                            <span
                              key={file.name}
                              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow-sm"
                            >
                              <FileText className="h-3.5 w-3.5 text-emerald-600" />
                              {file.name}
                              <button
                                type="button"
                                onClick={() => removeNewTicketFile(file.name)}
                                className="text-slate-400 transition hover:text-slate-700"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
                <Button
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={showNewTicketForm ? submitNewTicket : () => setShowNewTicketForm(true)}
                  disabled={creatingTicket}
                >
                  {creatingTicket ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TicketPlus className="mr-2 h-4 w-4" />
                  )}
                  {showNewTicketForm ? "Create Ticket" : "Create"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-slate-900">Your Tickets</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTickets(undefined, ticketPage)}
                    disabled={loadingList}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm appearance-none"
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="all">All statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm appearance-none"
                    value={filters.category}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    <option value="all">All categories</option>
                    <option value="general">General</option>
                    <option value="booking">Booking</option>
                    <option value="payment">Payment</option>
                    <option value="account">Account</option>
                    <option value="bug">Bug</option>
                    <option value="feature_request">Feature Request</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {loadingList ? (
                    <div className="flex items-center justify-center py-10 text-slate-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading tickets...
                    </div>
                  ) : tickets.length ? (
                    tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => openTicket(ticket.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selectedTicketId === ticket.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 bg-slate-50 hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              {ticket.ticketNumber}
                            </p>
                            <h3 className="mt-1 font-semibold text-slate-900">
                              {ticket.title}
                            </h3>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[ticket.status] || statusTone.open}`}
                          >
                            {formatLabel(ticket.status)}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                          {ticket.latestMessagePreview || ticket.description}
                        </p>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                          <span>{formatDateTime(ticket.lastMessageAt)}</span>
                          <span>{ticket.conversationCount} messages</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                      No support tickets yet. Create one whenever you need help.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                  <span>
                    Page {ticketMeta.page} of {ticketMeta.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTicketPage((current) => Math.max(current - 1, 1))}
                      disabled={loadingList || ticketPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTicketPage((current) =>
                          Math.min(current + 1, ticketMeta.totalPages),
                        )
                      }
                      disabled={loadingList || ticketPage >= ticketMeta.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              {selectedTicket ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {selectedTicket.ticketNumber}
                    </p>
                    <CardTitle className="mt-1 text-xl text-slate-900">
                      {selectedTicket.title}
                    </CardTitle>
                    <p className="mt-2 text-sm text-slate-500">
                      Last updated {formatDateTime(selectedTicket.lastMessageAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[selectedTicket.status] || statusTone.open}`}
                    >
                      {formatLabel(selectedTicket.status)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityTone[selectedTicket.priority] || priorityTone.medium}`}
                    >
                      {formatLabel(selectedTicket.priority)}
                    </span>
                    {["resolved", "closed"].includes(selectedTicket.status) && (
                      <Button variant="outline" size="sm" onClick={reopenTicket}>
                        Reopen Ticket
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <CardTitle className="text-slate-900">Ticket Detail</CardTitle>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {!selectedTicketId ? (
                <div className="flex min-h-[560px] items-center justify-center px-6 text-center text-slate-500">
                  Select a support ticket to view the conversation.
                </div>
              ) : loadingDetail ? (
                <div className="flex min-h-[560px] items-center justify-center text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading conversation...
                </div>
              ) : selectedTicket ? (
                <div className="grid min-h-[560px] grid-rows-[auto_1fr_auto]">
                  <div className="border-b border-slate-100 px-6 py-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Category:</span>{" "}
                    {formatLabel(selectedTicket.category)}
                    {selectedTicket.assignedTo?.name ? (
                      <>
                        <span className="mx-3 text-slate-300">|</span>
                        <span className="font-medium text-slate-900">Assigned:</span>{" "}
                        {selectedTicket.assignedTo.name}
                      </>
                    ) : null}
                  </div>

                  <div className="space-y-4 overflow-y-auto px-6 py-6">
                    {selectedTicket.conversations.map((conversation) => {
                      const isClient = conversation.senderType === "client";
                      return (
                        <div
                          key={conversation.id}
                          className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-2xl rounded-2xl px-4 py-3 shadow-sm ${
                              isClient
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <div className="mb-2 flex items-center gap-2 text-xs opacity-80">
                              <span className="font-semibold">
                                {conversation.senderName}
                              </span>
                              <span>{formatDateTime(conversation.createdAt)}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {conversation.message}
                            </p>
                            {conversation.attachments?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {conversation.attachments.map((attachment) => (
                                  <a
                                    key={attachment}
                                    href={buildAuthorizedUrl(attachment)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                                      isClient
                                        ? "bg-emerald-500/30 text-white"
                                        : "bg-white text-slate-700"
                                    }`}
                                  >
                                    <Paperclip className="h-3.5 w-3.5" />
                                    {formatFileName(attachment)}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 px-6 py-0">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      Reply to support
                    </div>
                    <Textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Add more details or respond to support"
                      className="min-h-[120px]"
                      disabled={selectedTicket.status === "closed"}
                    />
                    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                        <Paperclip className="h-4 w-4 text-emerald-600" />
                        Attach files
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleReplyFileChange}
                          disabled={selectedTicket.status === "closed"}
                        />
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Share screenshots, images, PDFs, or other supporting files.
                      </p>
                      {replyFiles.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {replyFiles.map((file) => (
                            <span
                              key={file.name}
                              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow-sm"
                            >
                              <FileText className="h-3.5 w-3.5 text-emerald-600" />
                              {file.name}
                              <button
                                type="button"
                                onClick={() => removeReplyFile(file.name)}
                                className="text-slate-400 transition hover:text-slate-700"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={submitReply}
                        disabled={
                          sendingReply ||
                          selectedTicket.status === "closed" ||
                          !replyMessage.trim()
                        }
                      >
                        {sendingReply ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[560px] items-center justify-center px-6 text-center text-slate-500">
                  We could not load that support ticket.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default SupportPage;




