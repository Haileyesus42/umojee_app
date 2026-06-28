import { Download, Loader2, Paperclip, RefreshCw, Search, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../config/axios-config';
import { Button } from '../../common/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../common/ui/card';
import { Input } from '../../common/ui/input';
import { Textarea } from '../../common/ui/textarea';
import { USER } from '../../constants/general';

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
  createdBy: null | {
    name: string;
    email: string;
  };
  assignedTo: null | {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type TicketDetail = TicketSummary & {
  description: string;
  conversations: Array<{
    id: string;
    senderType: 'client' | 'admin';
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

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

const statusTone: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-sky-100 text-sky-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
};

const priorityTone: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-rose-100 text-rose-700',
};

const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const backendUrl = ((import.meta as any).env.VITE_BACKEND_URL || '').replace(/\/$/, '');

const buildAttachmentUrl = (value: string) => {
  if (value.startsWith('http')) {
    return value;
  }

  if (backendUrl.endsWith('/api') && value.startsWith('/api/')) {
    return backendUrl + value.slice(4);
  }

  return backendUrl + value;
};


const formatFileName = (value: string) => {
  const cleanValue = value.split('?')[0];
  return cleanValue.substring(cleanValue.lastIndexOf('/') + 1);
};

const TicketQueuePage = () => {
  const navigate = useNavigate();
  const { ticketId: routeTicketId } = useParams<{ ticketId?: string }>();
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem(USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const currentUserId = currentUser?._id || '';
  const currentUserRole = currentUser?.role || '';

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketMeta, setTicketMeta] = useState<TicketListResponse>({
    items: [],
    page: 1,
    limit: 4,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    assignedTo: 'all',
    search: '',
  });

  const loadAdmins = async () => {
    try {
      const response = await API.get('/admin/user/getall');
      setAdmins(response.data?.data?.users || []);
    } catch {
      toast.error('Unable to load admin assignees');
    }
  };

  const loadTickets = async (preferredId?: string, pageOverride?: number) => {
    setLoadingList(true);
    try {
      const targetPage = pageOverride || ticketPage;
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', '4');
      params.set('sort', '-lastMessageAt');
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.priority !== 'all') params.set('priority', filters.priority);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.assignedTo !== 'all') params.set('assignedTo', filters.assignedTo);
      if (filters.search.trim()) params.set('search', filters.search.trim());

      const response = await API.get(`/admin/support-tickets?${params.toString()}`);
      const listData = (response.data?.data || {}) as TicketListResponse;
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
        (selectedTicketId && items.find((item: TicketSummary) => item.id === selectedTicketId)?.id) ||
        items[0]?.id ||
        '';

      setSelectedTicketId(nextSelectedId);
      if (nextSelectedId && nextSelectedId !== routeTicketId) {
        navigate('/tickets/' + nextSelectedId, { replace: true });
      }
      if (!nextSelectedId && routeTicketId) {
        navigate('/tickets', { replace: true });
      }
      if (!items.length) {
        setSelectedTicket(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load support queue');
    } finally {
      setLoadingList(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    if (!ticketId) return;

    setLoadingDetail(true);
    try {
      const response = await API.get(`/admin/support-tickets/${ticketId}`);
      setSelectedTicket(response.data.data as TicketDetail);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load ticket');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    loadTickets(undefined, ticketPage);
  }, [ticketPage]);

  useEffect(() => {
    setTicketPage(1);
  }, [filters.status, filters.priority, filters.category, filters.assignedTo]);

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

  const assignTicket = async (assignedTo: string) => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      const response = await API.patch(
        `/admin/support-tickets/${selectedTicket.id}/assign`,
        { assignedTo: assignedTo || null },
      );
      setSelectedTicket(response.data.data as TicketDetail);
      await loadTickets(selectedTicket.id, ticketPage);
      toast.success(assignedTo ? 'Ticket assigned' : 'Ticket unassigned');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update assignee');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      const response = await API.patch(
        `/admin/support-tickets/${selectedTicket.id}/status`,
        { status },
      );
      setSelectedTicket(response.data.data as TicketDetail);
      await loadTickets(selectedTicket.id, ticketPage);
      toast.success('Ticket status updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update ticket status');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      const response = await API.patch(
        `/admin/support-tickets/${selectedTicket.id}/close`,
      );
      setSelectedTicket(response.data.data as TicketDetail);
      await loadTickets(selectedTicket.id, ticketPage);
      toast.success('Ticket closed');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to close ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const reopenTicket = async () => {
    if (!selectedTicket) return;

    setUpdatingTicket(true);
    try {
      const response = await API.patch(
        `/admin/support-tickets/${selectedTicket.id}/reopen`,
      );
      setSelectedTicket(response.data.data as TicketDetail);
      await loadTickets(selectedTicket.id, ticketPage);
      toast.success('Ticket reopened');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to reopen ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const response = await API.post(
        `/admin/support-tickets/${selectedTicket.id}/conversations`,
        { message: replyMessage.trim() },
      );
      setReplyMessage('');
      setSelectedTicket(response.data.data as TicketDetail);
      await loadTickets(selectedTicket.id, ticketPage);
      toast.success('Reply sent');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const activeAdmins = useMemo(
    () =>
      admins.filter(
        (admin) =>
          admin.active !== false &&
          ['SuperAdmin', 'Manager', 'Supervisor'].includes(admin.role),
      ),
    [admins],
  );

  const assignedToMe = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.assignedTo?.id &&
          ticket.assignedTo.id === currentUserId &&
          ticket.status !== 'closed',
      ),
    [currentUserId, tickets],
  );

  const canAssignTickets = useMemo(
    () => ['SuperAdmin', 'Manager', 'Supervisor'].includes(currentUserRole),
    [currentUserRole],
  );

  const openTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    navigate('/tickets/' + ticketId);
  };

  const sortedTickets = useMemo(() => {
    const getRank = (ticket: TicketSummary) => {
      if (ticket.status === 'closed') {
        return 2;
      }

      if (ticket.assignedTo?.id) {
        return 0;
      }

      return 1;
    };

    return [...tickets].sort((left, right) => {
      const rankDiff = getRank(left) - getRank(right);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime();
    });
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* {currentUserId ? (
        <Card className="border border-emerald-200 bg-emerald-50/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-900">Assigned To You</CardTitle>
          </CardHeader>
          <CardContent>
            {assignedToMe.length ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {assignedToMe.slice(0, 6).map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => openTicket(ticket.id)}
                    className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-left transition hover:border-emerald-400"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          priorityTone[ticket.priority] || priorityTone.medium
                        }`}
                      >
                        {formatLabel(ticket.priority)}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-900">{ticket.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {ticket.createdBy?.name || 'Customer'}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No tickets are currently assigned to you.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null} */}

      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Support Operations
              </p>
              <div className="mt-1 flex items-center gap-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Ticket Queue
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowFilters((current) => !current)}
                  className="text-xs font-medium mt-1 text-blue-500 transition hover:text-slate-800"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search ticket number or title"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      loadTickets(undefined, ticketPage);
                    }
                  }}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => loadTickets(undefined, ticketPage)}
                disabled={loadingList}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters ? (
          <CardContent className="grid gap-3 lg:grid-cols-4">
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.priority}
              onChange={(event) =>
                setFilters((current) => ({ ...current, priority: event.target.value }))
              }
            >
              <option value="all">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({ ...current, category: event.target.value }))
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
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.assignedTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, assignedTo: event.target.value }))
              }
            >
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {activeAdmins.map((admin) => (
                <option key={admin._id} value={admin._id}>
                  {admin.name}
                </option>
              ))}
            </select>
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="border border-slate-200 bg-white shadow-sm xl:flex xl:h-[calc(100vh-2rem)] xl:flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-900">Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:overflow-hidden">
            <div className="space-y-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
              {loadingList ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading tickets...
                </div>
              ) : sortedTickets.length ? (
                sortedTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => openTicket(ticket.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedTicketId === ticket.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
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
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusTone[ticket.status] || statusTone.open
                        }`}
                      >
                        {formatLabel(ticket.status)}
                      </span>
                    </div>
                    {ticket.assignedTo?.id === currentUserId ? (
                      <div className="mt-3">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Assigned to you
                        </span>
                      </div>
                    ) : null}
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {ticket.latestMessagePreview || ticket.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <span>{ticket.createdBy?.name || 'Customer'}</span>
                      <span>{formatDateTime(ticket.lastMessageAt)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No tickets match the current filters.
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
                    setTicketPage((current) => Math.min(current + 1, ticketMeta.totalPages))
                  }
                  disabled={loadingList || ticketPage >= ticketMeta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm xl:flex xl:h-[calc(100vh-2rem)] xl:flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            {selectedTicket ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {selectedTicket.ticketNumber}
                    </p>
                    <CardTitle className="mt-1 text-xl text-slate-900">
                      {selectedTicket.title}
                    </CardTitle>
                    <p className="mt-2 text-sm text-slate-500">
                      Opened by {selectedTicket.createdBy?.name || 'Customer'} on{' '}
                      {formatDateTime(selectedTicket.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        statusTone[selectedTicket.status] || statusTone.open
                      }`}
                    >
                      {formatLabel(selectedTicket.status)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        priorityTone[selectedTicket.priority] || priorityTone.medium
                      }`}
                    >
                      {formatLabel(selectedTicket.priority)}
                    </span>
                    {selectedTicket.assignedTo?.id === currentUserId ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Assigned to you
                      </span>
                    ) : null}
                  </div>
                </div>

                {showActions ? (
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto_auto_auto]">
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={selectedTicket.assignedTo?.id || ''}
                    onChange={(event) => assignTicket(event.target.value)}
                    disabled={updatingTicket || !canAssignTickets}
                  >
                    <option value="">Unassigned</option>
                    {activeAdmins.map((admin) => (
                      <option key={admin._id} value={admin._id}>
                        {admin.name} ({admin.role})
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={selectedTicket.status}
                    onChange={(event) => updateStatus(event.target.value)}
                    disabled={updatingTicket || !canAssignTickets}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <Button
                    variant="outline"
                    onClick={reopenTicket}
                    disabled={updatingTicket || !['resolved', 'closed'].includes(selectedTicket.status)}
                  >
                    Reopen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={closeTicket}
                    disabled={updatingTicket || selectedTicket.status === 'closed'}
                  >
                    Close
                  </Button>
                  <Button variant="outline" onClick={() => loadTicketDetail(selectedTicket.id)}>
                    Refresh
                  </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <CardTitle className="text-slate-900">Ticket Detail</CardTitle>
            )}
          </CardHeader>
          <CardContent className="p-0 xl:min-h-0 xl:flex-1 xl:overflow-hidden">
            {!selectedTicketId ? (
              <div className="flex min-h-[560px] items-center justify-center px-6 text-center text-slate-500 xl:h-full xl:min-h-0 xl:overflow-hidden">
                Select a ticket to inspect and respond.
              </div>
            ) : loadingDetail ? (
              <div className="flex min-h-[560px] items-center justify-center text-slate-500 xl:h-full xl:min-h-0 xl:overflow-hidden">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading ticket detail...
              </div>
            ) : selectedTicket ? (
              <div className="grid min-h-[560px] grid-rows-[auto_1fr_auto] xl:h-full xl:min-h-0 xl:overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">Customer:</span>{' '}
                  {selectedTicket.createdBy?.name || 'Customer'}
                  <span className="mx-3 text-slate-300">|</span>
                  <span className="font-medium text-slate-900">Email:</span>{' '}
                  {selectedTicket.createdBy?.email || 'Not available'}
                  <button
                    type="button"
                    onClick={() => setShowActions((current) => !current)}
                    className="ml-3 font-normal text-xs text-blue-500 transition hover:text-slate-800"
                  >
                    {showActions ? 'Hide Actions' : 'Show Actions'}
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto overscroll-contain px-6 py-6 xl:min-h-0">
                  {selectedTicket.conversations.map((conversation) => {
                    const isAdmin = conversation.senderType === 'admin';
                    return (
                      <div
                        key={conversation.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-2xl rounded-2xl px-4 py-3 shadow-sm ${
                            isAdmin
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-900'
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
                                  href={buildAttachmentUrl(attachment)}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={formatFileName(attachment)}
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                                    isAdmin
                                      ? 'bg-emerald-500/30 text-white'
                                      : 'bg-white text-slate-700'
                                  }`}
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                  <span>{formatFileName(attachment)}</span>
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 px-6 py-5">
                  <div className="mb-3 text-sm font-medium text-slate-700">
                    Reply to customer
                  </div>
                  <Textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder="Write a clear support response"
                    className="min-h-[120px]"
                    disabled={selectedTicket.status === 'closed'}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={sendReply}
                      disabled={
                        sendingReply ||
                        selectedTicket.status === 'closed' ||
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
              <div className="flex min-h-[560px] items-center justify-center px-6 text-center text-slate-500 xl:h-full xl:min-h-0 xl:overflow-hidden">
                We could not load the selected ticket.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketQueuePage;













