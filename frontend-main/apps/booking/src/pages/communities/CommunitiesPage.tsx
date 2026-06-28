import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import {
  Globe2,
  MapPin,
  MessageSquare,
  Send,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import DefaultLayout from "../../layout/DefaultLayout";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { Button } from "../../common/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../common/ui/card";
import { Input } from "../../common/ui/input";
import { Textarea } from "../../common/ui/textarea";
import { getLocalStorageValue } from "../../lib/utils";
import { useNotificationCenter } from "../../context/NotificationCenterContext";

const backendUrl =
  (process.env.REACT_APP_BACKEND_URL as string) || "http://localhost:4001";

type SocialUser = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  photo?: string | null;
  relationshipState?: string;
  country?: string;
  city?: string;
};

type FriendRequestItem = {
  _id: string;
  status: string;
  direction: "incoming" | "outgoing";
  createdAt: string;
  user: SocialUser | null;
};

type ShareItem = {
  _id: string;
  journeyId: string;
  recipientEmail: string;
  status: string;
  activatedAt?: string | null;
  createdAt: string;
  ownerUser?: SocialUser | null;
  recipientUserId?: SocialUser | null;
};

type MessageThread = {
  id: string;
  participant: SocialUser | null;
  lastMessageAt?: string;
  lastMessagePreview?: string;
};

type MessageItem = {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  messageType: "text" | "journey_share";
  content: string;
  metadata?: {
    journeyId?: string;
    sharedJourneyUrl?: string;
  };
  sentAt: string;
  sender: SocialUser;
  recipient: SocialUser;
};

const tabOrder = [
  { id: "nearby", label: "Nearby", icon: MapPin },
  { id: "discover", label: "Discover", icon: Globe2 },
  { id: "incoming", label: "Requests", icon: UserPlus },
  { id: "sent", label: "Sent", icon: Send },
  { id: "friends", label: "Friends", icon: Users },
  { id: "shared", label: "Shared", icon: Share2 },
  { id: "messages", label: "Messages", icon: MessageSquare },
] as const;

type CommunitiesTab = (typeof tabOrder)[number]["id"];

function getAuthHeaders() {
  const token = getLocalStorageValue("token") as string | null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function fullName(user?: SocialUser | null) {
  if (!user) return "Unknown traveler";
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

const CommunitiesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getLocalStorageValue("user") as any;
  const defaultCountry =
    currentUser?.country || currentUser?.homeLocation?.country || "";
  const requestedTab = searchParams.get("tab");
  const requestedThreadId = searchParams.get("threadId");

  const [activeTab, setActiveTab] = useState<CommunitiesTab>("nearby");
  const [nearbyUsers, setNearbyUsers] = useState<SocialUser[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<SocialUser[]>([]);
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequestItem[]>([]);
  const [ownedShares, setOwnedShares] = useState<ShareItem[]>([]);
  const [receivedShares, setReceivedShares] = useState<ShareItem[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageItem[]>([]);
  const [countryQuery, setCountryQuery] = useState(defaultCountry);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messageRecipient, setMessageRecipient] = useState<SocialUser | null>(null);
  const { notifications, lastEvent, markAsSeen } = useNotificationCenter();

  const loadFriends = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/client/social/friends`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Unable to load friends");
    setFriends(Array.isArray(data?.data) ? data.data : []);
  }, []);

  const loadRequests = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/client/social/friend-requests`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Unable to load requests");
    setIncomingRequests(Array.isArray(data?.data?.incoming) ? data.data.incoming : []);
    setSentRequests(Array.isArray(data?.data?.outgoing) ? data.data.outgoing : []);
  }, []);

  const loadShares = useCallback(async () => {
    const [ownedResponse, receivedResponse] = await Promise.all([
      fetch(`${backendUrl}/api/client/journey-shares`, { headers: getAuthHeaders() }),
      fetch(`${backendUrl}/api/client/journey-shares/received`, { headers: getAuthHeaders() }),
    ]);

    const ownedData = await ownedResponse.json().catch(() => null);
    const receivedData = await receivedResponse.json().catch(() => null);

    if (!ownedResponse.ok) throw new Error(ownedData?.message || "Unable to load shares");
    if (!receivedResponse.ok) throw new Error(receivedData?.message || "Unable to load shares");

    setOwnedShares(Array.isArray(ownedData?.data) ? ownedData.data : []);
    setReceivedShares(Array.isArray(receivedData?.data) ? receivedData.data : []);
  }, []);

  const loadThreads = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/client/social/messages/threads`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Unable to load messages");
    const items = Array.isArray(data?.data) ? data.data : [];
    setThreads(items);
    if (!selectedThreadId && items[0]?.id) {
      setSelectedThreadId(items[0].id);
    }
  }, [selectedThreadId]);

  const loadNearbyUsers = useCallback(async () => {
    const query = countryQuery.trim() || defaultCountry;
    const response = await fetch(
      `${backendUrl}/api/client/social/discover?country=${encodeURIComponent(query)}&limit=5`,
      { headers: getAuthHeaders() }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Unable to load nearby users");
    setNearbyUsers(Array.isArray(data?.data) ? data.data : []);
  }, [countryQuery, defaultCountry]);

  const loadDiscoverUsers = useCallback(async () => {
    if (searchQuery.trim().length < 2) {
      setDiscoverUsers([]);
      return;
    }
    const response = await fetch(
      `${backendUrl}/api/client/social/search?q=${encodeURIComponent(searchQuery.trim())}`,
      { headers: getAuthHeaders() }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Unable to search users");
    setDiscoverUsers(Array.isArray(data?.data) ? data.data : []);
  }, [searchQuery]);

  const loadThreadMessages = useCallback(async (threadId: string) => {
    const response = await fetch(
      `${backendUrl}/api/client/social/messages/threads/${encodeURIComponent(threadId)}`,
      { headers: getAuthHeaders() }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Unable to load conversation");
    setThreadMessages(Array.isArray(data?.data?.messages) ? data.data.messages : []);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        loadFriends(),
        loadRequests(),
        loadShares(),
        loadThreads(),
        loadNearbyUsers(),
      ]);
    } catch (error: any) {
      toast.error(error.message || "Unable to refresh communities");
    }
  }, [loadFriends, loadNearbyUsers, loadRequests, loadShares, loadThreads]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const allowedTabs = new Set<CommunitiesTab>(tabOrder.map((tab) => tab.id));
    if (requestedTab && allowedTabs.has(requestedTab as CommunitiesTab)) {
      setActiveTab(requestedTab as CommunitiesTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (activeTab === "discover") {
      loadDiscoverUsers().catch((error: any) => {
        toast.error(error.message || "Unable to search users");
      });
    }
  }, [activeTab, loadDiscoverUsers]);

  useEffect(() => {
    if (selectedThreadId) {
      loadThreadMessages(selectedThreadId).catch((error: any) => {
        toast.error(error.message || "Unable to load conversation");
      });
    } else {
      setThreadMessages([]);
    }
  }, [loadThreadMessages, selectedThreadId]);

  useEffect(() => {
    if (requestedTab !== "messages" || !requestedThreadId || !threads.length) return;
    const matchingThread = threads.find((thread) => thread.id === requestedThreadId);
    if (!matchingThread) return;

    setSelectedThreadId(matchingThread.id);
    setMessageRecipient(matchingThread.participant || null);
  }, [requestedTab, requestedThreadId, threads]);

  useEffect(() => {
    if (!lastEvent?.type) return;

    if (lastEvent.type === "friend_request_received") {
      loadRequests().catch(() => null);
      return;
    }

    if (lastEvent.type === "friend_request_accepted") {
      Promise.all([loadFriends(), loadRequests(), loadShares()]).catch(() => null);
      return;
    }

    if (lastEvent.type === "journey_shared") {
      loadShares().catch(() => null);
      return;
    }

    if (lastEvent.type === "message_received") {
      loadThreads()
        .then(() => {
          if (selectedThreadId && lastEvent.metadata?.threadId === selectedThreadId) {
            return loadThreadMessages(selectedThreadId);
          }
          return Promise.resolve();
        })
        .catch(() => null);
    }
  }, [lastEvent, loadFriends, loadRequests, loadShares, loadThreadMessages, loadThreads, selectedThreadId]);

  const unreadByTab = useMemo(() => {
    return notifications.reduce<Record<string, number>>((acc, notification) => {
      if (notification.seen) return acc;
      switch (notification.type) {
        case "friend_request_received":
          acc.incoming = (acc.incoming || 0) + 1;
          break;
        case "friend_request_accepted":
          acc.friends = (acc.friends || 0) + 1;
          break;
        case "journey_shared":
          acc.shared = (acc.shared || 0) + 1;
          break;
        case "message_received":
          acc.messages = (acc.messages || 0) + 1;
          break;
        default:
          break;
      }
      return acc;
    }, {});
  }, [notifications]);

  useEffect(() => {
    const matchingTypes: Record<CommunitiesTab, string[]> = {
      nearby: [],
      discover: [],
      incoming: ["friend_request_received"],
      sent: [],
      friends: ["friend_request_accepted"],
      shared: ["journey_shared"],
      messages: ["message_received"],
    };

    const currentTypes = matchingTypes[activeTab] || [];
    if (!currentTypes.length) return;

    const unseenItems = notifications.filter(
      (notification) => !notification.seen && currentTypes.includes(notification.type || "")
    );
    if (!unseenItems.length) return;

    Promise.all(unseenItems.map((notification) => markAsSeen(notification._id))).catch(() => null);
  }, [activeTab, markAsSeen, notifications]);

  const switchTab = useCallback((tabId: CommunitiesTab) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    if (tabId !== "messages") {
      nextParams.delete("threadId");
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleFriendAction = async (user: SocialUser, action: "add" | "message") => {
    if (action === "message") {
      setMessageRecipient(user);
      switchTab("messages");
      const existingThread = threads.find((thread) => thread.participant?._id === user._id);
      if (existingThread) {
        setSelectedThreadId(existingThread.id);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("tab", "messages");
        nextParams.set("threadId", existingThread.id);
        setSearchParams(nextParams, { replace: true });
      } else {
        setSelectedThreadId(null);
        setThreadMessages([]);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("tab", "messages");
        nextParams.delete("threadId");
        setSearchParams(nextParams, { replace: true });
      }
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/client/social/friend-requests`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ recipientUserId: user._id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to send friend request");
      toast.success("Friend request sent.");
      await Promise.all([loadRequests(), loadNearbyUsers(), loadDiscoverUsers()]);
    } catch (error: any) {
      toast.error(error.message || "Unable to send friend request");
    }
  };

  const handleRequestResponse = async (requestId: string, mode: "accept" | "decline" | "cancel") => {
    try {
      const response = await fetch(
        `${backendUrl}/api/client/social/friend-requests/${encodeURIComponent(requestId)}/${mode}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to update request");
      toast.success(mode === "accept" ? "Friend request accepted." : "Request updated.");
      await Promise.all([loadFriends(), loadRequests(), loadShares(), loadDiscoverUsers(), loadNearbyUsers()]);
    } catch (error: any) {
      toast.error(error.message || "Unable to update request");
    }
  };

  const handleSendMessage = async () => {
    const content = messageDraft.trim();
    if (!messageRecipient || !content) return;

    try {
      const response = await fetch(`${backendUrl}/api/client/social/messages`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipientUserId: messageRecipient._id,
          content,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Unable to send message");
      setMessageDraft("");
      await loadThreads();
      if (data?.data?.threadId) {
        setSelectedThreadId(data.data.threadId);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("tab", "messages");
        nextParams.set("threadId", data.data.threadId);
        setSearchParams(nextParams, { replace: true });
        await loadThreadMessages(data.data.threadId);
      }
    } catch (error: any) {
      toast.error(error.message || "Unable to send message");
    }
  };

  const currentThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads]
  );

  const renderUserCard = (user: SocialUser, context: "nearby" | "discover" | "friends") => (
    <div
      key={`${context}-${user._id}`}
      className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-900">{fullName(user)}</p>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {user.city && <span className="rounded-full bg-slate-100 px-2 py-1">{user.city}</span>}
            {user.country && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{user.country}</span>}
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          {user.relationshipState === "friend"
            ? "Friend"
            : user.relationshipState === "outgoing_request"
              ? "Pending"
              : user.relationshipState === "incoming_request"
                ? "Needs reply"
                : "Discover"}
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 translate-y-4 rounded-lg border border-slate-200 bg-slate-950 p-4 opacity-0 shadow-xl transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-sm font-semibold text-white">{fullName(user)}</p>
        <p className="mt-1 text-xs text-slate-300">{user.email}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => handleFriendAction(user, "message")}
          >
            Message
          </Button>
          {user.relationshipState !== "friend" && user.relationshipState !== "outgoing_request" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-slate-600 bg-transparent text-white hover:bg-white/10"
              onClick={() => handleFriendAction(user, "add")}
            >
              Add Friend
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DefaultLayout>
      <div className="mx-auto w-full max-w-[1480px] px-4 py-8 md:px-6 xl:px-10">
        <Breadcrumb pageName="Communities" />

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#071d2b_0%,#0f766e_55%,#14b8a6_100%)] px-6 py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">Social Travel</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-semibold leading-tight">Build your travel circle and keep every shared moment in one place.</h1>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Discover nearby travelers, manage requests, chat before or after friendship, and follow shared live journeys without leaving the app.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[320px]">
                <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-semibold">{friends.length}</p>
                  <p className="mt-1 text-white/75">Friends</p>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-semibold">{threads.length}</p>
                  <p className="mt-1 text-white/75">Message threads</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {tabOrder.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {(unreadByTab[tab.id] || 0) > 0 && (
                      <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        {unreadByTab[tab.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6 px-4 py-6 md:px-6">
            {(activeTab === "nearby" || activeTab === "discover") && (
              <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                <Card className="rounded-lg border-slate-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {activeTab === "nearby" ? "Nearby Travelers" : "Discover by Search"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeTab === "nearby" ? (
                      <>
                        <div className="flex gap-3">
                          <Input
                            value={countryQuery}
                            onChange={(event) => setCountryQuery(event.target.value)}
                            placeholder="Country"
                          />
                          <Button type="button" onClick={() => loadNearbyUsers().catch((error: any) => toast.error(error.message))}>
                            Refresh
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {nearbyUsers.map((user) => renderUserCard(user, "nearby"))}
                        </div>
                      </>
                    ) : (
                      <>
                        <Input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search by name or email"
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                          {discoverUsers.map((user) => renderUserCard(user, "discover"))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg border-slate-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Country Spotlight</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm leading-7 text-slate-600">
                      Communities starts by surfacing up to five travelers from your current country focus, so you can build connection paths before sharing journeys.
                    </p>
                    <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      Current focus: <strong>{countryQuery || defaultCountry || "Global"}</strong>
                    </div>
                    <p className="text-sm leading-7 text-slate-500">
                      Hover a traveler card to reveal quick actions for messaging and friend requests.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "incoming" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {incomingRequests.map((request) => (
                  <Card key={request._id} className="rounded-lg border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">{fullName(request.user)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-500">{request.user?.email}</p>
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => handleRequestResponse(request._id, "accept")}>Accept</Button>
                        <Button type="button" variant="outline" onClick={() => handleRequestResponse(request._id, "decline")}>Decline</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "sent" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sentRequests.map((request) => (
                  <Card key={request._id} className="rounded-lg border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">{fullName(request.user)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-500">{request.user?.email}</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => handleFriendAction(request.user!, "message")}>Message</Button>
                        <Button type="button" variant="outline" onClick={() => handleRequestResponse(request._id, "cancel")}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "friends" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {friends.map((user) => renderUserCard(user, "friends"))}
              </div>
            )}

            {activeTab === "shared" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="rounded-lg border-slate-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Shared by You</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ownedShares.map((share) => (
                      <div key={share._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Journey {share.journeyId}</p>
                        <p className="mt-1 text-sm text-slate-600">{share.recipientUserId ? fullName(share.recipientUserId) : share.recipientEmail}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-700">{share.status}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-lg border-slate-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Shared With You</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {receivedShares.map((share) => (
                      <div key={share._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Journey {share.journeyId}</p>
                        <p className="mt-1 text-sm text-slate-600">{fullName(share.ownerUser || null)}</p>
                        <a
                          href={`/journey/${share.journeyId}`}
                          className="mt-3 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          Open shared live page
                        </a>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "messages" && (
              <div className="grid gap-6 lg:grid-cols-[0.95fr,1.35fr]">
                <Card className="rounded-lg border-slate-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">Conversations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {threads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          setSelectedThreadId(thread.id);
                          setMessageRecipient(thread.participant || null);
                          const nextParams = new URLSearchParams(searchParams);
                          nextParams.set("tab", "messages");
                          nextParams.set("threadId", thread.id);
                          setSearchParams(nextParams, { replace: true });
                        }}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                          selectedThreadId === thread.id
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{fullName(thread.participant)}</p>
                        <p className="mt-1 text-xs text-slate-500">{thread.lastMessagePreview || "No messages yet."}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-lg border-slate-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {messageRecipient ? `Chat with ${fullName(messageRecipient)}` : currentThread?.participant ? `Chat with ${fullName(currentThread.participant)}` : "Messages"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                      {threadMessages.map((message) => {
                        const isMine = message.senderUserId === currentUser?._id;
                        return (
                          <div
                            key={message.id}
                            className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-7 ${
                              isMine
                                ? "ml-auto bg-emerald-600 text-white"
                                : "bg-white text-slate-700 shadow-sm"
                            }`}
                          >
                            <p>{message.content}</p>
                            {message.messageType === "journey_share" && message.metadata?.sharedJourneyUrl && (
                              <a
                                href={message.metadata.sharedJourneyUrl}
                                className={`mt-2 inline-flex text-xs font-semibold ${
                                  isMine ? "text-white underline" : "text-emerald-700"
                                }`}
                              >
                                Open shared journey
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      {!messageRecipient && (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          Hover a traveler card and choose Message to start a direct conversation.
                        </div>
                      )}
                      <Textarea
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        placeholder={messageRecipient ? `Message ${fullName(messageRecipient)}` : "Select or open a user card first"}
                        className="min-h-[120px]"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleSendMessage}
                          disabled={!messageRecipient || !messageDraft.trim()}
                        >
                          Send message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </div>
    </DefaultLayout>
  );
};

export default CommunitiesPage;
