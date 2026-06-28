import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, Mail, RefreshCcw, Search, Share2, UserPlus, UserX, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../common/ui/dialog";
import { Button } from "../../../../common/ui/button";
import { Input } from "../../../../common/ui/input";
import { getLocalStorageValue } from "../../../../lib/utils";
import { emailRegex } from "../../../../lib/utils";

const backendUrl =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";

type SearchResult = {
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  photo?: string | null;
  relationshipState:
    | "friend"
    | "outgoing_request"
    | "incoming_request"
    | "none"
    | "self";
};

type SelectedRecipient = {
  key: string;
  userId?: string;
  email: string;
  label: string;
  relationshipState?: SearchResult["relationshipState"] | "invite";
};

type ShareRecipientSummary = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  photo?: string | null;
};

type OwnedShare = {
  _id: string;
  journeyId: string;
  recipientEmail: string;
  recipientUserId: ShareRecipientSummary | null;
  status: "pending_friendship" | "pending_signup" | "active" | "revoked";
  activatedAt?: string | null;
  revokedAt?: string | null;
  lastViewedAt?: string | null;
  isWatching?: boolean;
};

interface JourneyShareDialogProps {
  open: boolean;
  journeyId: string | null | undefined;
  onClose: () => void;
}

function getAuthHeaders() {
  const token = getLocalStorageValue("token") as string | null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function relationshipCopy(state?: string) {
  switch (state) {
    case "friend":
      return "Friend";
    case "outgoing_request":
      return "Friend request pending";
    case "incoming_request":
      return "Incoming friend request";
    case "invite":
      return "Invite by email";
    default:
      return "Not connected yet";
  }
}

function shareStatusCopy(status: OwnedShare["status"]) {
  switch (status) {
    case "active":
      return "Live access";
    case "revoked":
      return "Revoked";
    case "pending_signup":
      return "Invite sent";
    default:
      return "Friend request pending";
  }
}

function fullName(user?: {
  firstName?: string;
  lastName?: string;
  email?: string;
} | null) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "";
}

const JourneyShareDialog: React.FC<JourneyShareDialogProps> = ({
  open,
  journeyId,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SelectedRecipient[]>([]);
  const [ownedShares, setOwnedShares] = useState<OwnedShare[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [busyShareId, setBusyShareId] = useState<string | null>(null);

  const fetchOwnedShares = useCallback(async () => {
    if (!journeyId || !open) return;
    try {
      setIsLoadingShares(true);
      const response = await fetch(`${backendUrl}/api/client/journey-shares`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load existing shares");
      }
      const shares = Array.isArray(data?.data) ? data.data : [];
      setOwnedShares(
        shares.filter((share: OwnedShare) => String(share.journeyId) === String(journeyId))
      );
    } catch (error: any) {
      toast.error(error.message || "Unable to load shared travelers");
    } finally {
      setIsLoadingShares(false);
    }
  }, [journeyId, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected([]);
      setOwnedShares([]);
      setIsSearching(false);
      setIsSubmitting(false);
      setBusyShareId(null);
      return;
    }

    fetchOwnedShares();
    const interval = window.setInterval(fetchOwnedShares, 8000);
    return () => window.clearInterval(interval);
  }, [fetchOwnedShares, open]);

  useEffect(() => {
    if (!open) return;

    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch(
          `${backendUrl}/api/client/social/search?q=${encodeURIComponent(normalized)}`,
          { headers: getAuthHeaders(), signal: controller.signal }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || "Search failed");
        }
        setResults(Array.isArray(data?.data) ? data.data : []);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          toast.error(error.message || "Unable to search contacts");
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const manualInvite = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!emailRegex.test(normalized)) return null;
    const alreadyKnown = results.some(
      (item) => item.email.toLowerCase() === normalized
    );
    const alreadySelected = selected.some(
      (item) => item.email.toLowerCase() === normalized
    );
    if (alreadyKnown || alreadySelected) return null;
    return {
      key: `invite:${normalized}`,
      email: normalized,
      label: normalized,
      relationshipState: "invite" as const,
    };
  }, [query, results, selected]);

  const toggleRecipient = (recipient: SelectedRecipient) => {
    setSelected((prev) => {
      const exists = prev.some((item) => item.key === recipient.key);
      if (exists) {
        return prev.filter((item) => item.key !== recipient.key);
      }
      return [...prev, recipient];
    });
  };

  const handleAddFriend = async (recipientUserId?: string) => {
    if (!recipientUserId) return;
    try {
      const response = await fetch(`${backendUrl}/api/client/social/friend-requests`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientUserId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to send friend request");
      }
      toast.success("Friend request sent.");
    } catch (error: any) {
      toast.error(error.message || "Unable to send friend request");
    }
  };

  const handleShare = async (recipientsOverride?: SelectedRecipient[]) => {
    const recipients = recipientsOverride || selected;
    if (!journeyId || recipients.length === 0) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${backendUrl}/api/client/journey-shares`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          journeyId,
          recipients: recipients.map((item) => ({
            userId: item.userId,
            email: item.email,
          })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to share journey");
      }

      const summaries = Array.isArray(data?.data) ? data.data : [];
      const activeCount = summaries.filter((item: any) => item.status === "active").length;
      const pendingCount = summaries.filter((item: any) => item.status !== "active").length;
      if (activeCount > 0 && pendingCount === 0) {
        toast.success("Journey shared successfully.");
      } else if (activeCount > 0 || pendingCount > 0) {
        toast.success(
          `${activeCount} live share${activeCount === 1 ? "" : "s"} sent, ${pendingCount} pending step${pendingCount === 1 ? "" : "s"}.`
        );
      }
      setSelected([]);
      await fetchOwnedShares();
    } catch (error: any) {
      toast.error(error.message || "Unable to share journey");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      setBusyShareId(shareId);
      const response = await fetch(`${backendUrl}/api/client/journey-shares/${shareId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Unable to revoke access");
      }
      toast.success("Shared access revoked.");
      await fetchOwnedShares();
    } catch (error: any) {
      toast.error(error.message || "Unable to revoke access");
    } finally {
      setBusyShareId(null);
    }
  };

  const handleReshare = async (share: OwnedShare) => {
    const recipient: SelectedRecipient = {
      key: share.recipientUserId?._id || share.recipientEmail,
      userId: share.recipientUserId?._id,
      email: share.recipientUserId?.email || share.recipientEmail,
      label: fullName(share.recipientUserId) || share.recipientEmail,
      relationshipState: share.recipientUserId ? "friend" : "invite",
    };
    setBusyShareId(share._id);
    await handleShare([recipient]);
    setBusyShareId(null);
  };

  const sharedClients = useMemo(
    () => ownedShares.filter((share) => share.status === "active" || share.status === "revoked"),
    [ownedShares]
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-2xl rounded-lg p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Share Live Journey
          </DialogTitle>
          <DialogDescription>
            Share live access, see who is actively watching, revoke access, and restore it instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Shared travelers</p>
                <p className="text-xs text-muted-foreground">
                  Active viewers update automatically while this panel is open.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={fetchOwnedShares}
                disabled={isLoadingShares}
              >
                <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${isLoadingShares ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="space-y-2">
              {sharedClients.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
                  No one has been shared on this journey yet.
                </div>
              ) : (
                sharedClients.map((share) => {
                  const recipient = share.recipientUserId;
                  const isBusy = busyShareId === share._id;
                  return (
                    <div
                      key={share._id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {fullName(recipient) || share.recipientEmail}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              share.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {shareStatusCopy(share.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {recipient?.email || share.recipientEmail}
                        </p>
                        {share.status === "active" && (
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                share.isWatching ? "text-emerald-700" : "text-slate-500"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  share.isWatching ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              />
                              {share.isWatching ? "Watching now" : "Not watching now"}
                            </span>
                            {share.lastViewedAt && (
                              <span className="text-slate-400">
                                Last seen {new Date(share.lastViewedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {share.status === "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => handleRevoke(share._id)}
                            disabled={isBusy}
                          >
                            <UserX className="mr-2 h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() => handleReshare(share)}
                            disabled={isBusy || isSubmitting}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Reshare
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search friend or enter email"
              className="pl-9"
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((recipient) => (
                <button
                  key={recipient.key}
                  type="button"
                  onClick={() => toggleRecipient(recipient)}
                  className="rounded-md border border-border bg-muted px-3 py-1 text-xs text-foreground"
                >
                  {recipient.label} x
                </button>
              ))}
            </div>
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {manualInvite && (
              <button
                type="button"
                onClick={() => toggleRecipient(manualInvite)}
                className="flex w-full items-start gap-3 rounded-md border border-dashed border-primary/50 bg-primary/5 px-3 py-3 text-left"
              >
                <Mail className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{manualInvite.email}</p>
                  <p className="text-xs text-muted-foreground">Invite to join Umoja Airways and queue the share.</p>
                </div>
              </button>
            )}

            {results.map((result) => {
              const selectedItem: SelectedRecipient = {
                key: result._id || result.email,
                userId: result._id,
                email: result.email,
                label: [result.firstName, result.lastName].filter(Boolean).join(" ").trim() || result.email,
                relationshipState: result.relationshipState,
              };
              const isSelected = selected.some((item) => item.key === selectedItem.key);
              const canSelectForShare = result.relationshipState === "friend";

              return (
                <div
                  key={selectedItem.key}
                  className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-3 transition ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  {result.relationshipState === "friend" ? (
                    <Users className="mt-0.5 h-4 w-4 text-emerald-600" />
                  ) : (
                    <UserPlus className="mt-0.5 h-4 w-4 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {[result.firstName, result.lastName].filter(Boolean).join(" ").trim() || result.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{result.email}</p>
                    <p className="mt-1 text-[11px] text-primary/80">
                      {relationshipCopy(result.relationshipState)}
                    </p>
                  </div>
                  {canSelectForShare ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "outline" : "default"}
                      className="h-8"
                      onClick={() => toggleRecipient(selectedItem)}
                    >
                      {isSelected ? "Selected" : "Share"}
                    </Button>
                  ) : result.relationshipState === "none" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => handleAddFriend(result._id)}
                    >
                      Add Friend
                    </Button>
                  ) : result.relationshipState === "incoming_request" ? (
                    <span className="self-center text-[11px] font-medium text-amber-700">
                      Accept in Communities
                    </span>
                  ) : result.relationshipState === "outgoing_request" ? (
                    <span className="self-center text-[11px] font-medium text-slate-500">
                      Request pending
                    </span>
                  ) : (
                    <span className="self-center text-[11px] font-medium text-slate-500">
                      Pending
                    </span>
                  )}
                </div>
              );
            })}

            {!isSearching && query.trim().length >= 2 && results.length === 0 && !manualInvite && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                No travelers matched that search yet.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => handleShare()}
            disabled={!journeyId || selected.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JourneyShareDialog;
