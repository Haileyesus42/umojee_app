import { Role } from '../constants/enum';

const Permissions = {
  CREATE_FLIGHT: [
    Role.SuperAdmin,
    Role.Admin,
    Role.Manager,
    // Role.Supervisor,
    // Role.Agent,
  ],
  // MODIFY_FLIGHT: [Role.SuperAdmin, Role.Admin, Role.Supervisor, Role.Agent],
  MODIFY_FLIGHT: [Role.SuperAdmin],
  CANCEL_FLIGHT: [Role.SuperAdmin, Role.Admin, Role.Manager, Role.Supervisor],
  ARCHIVE_FLIGHT: [Role.SuperAdmin],
  // ARCHIVE_FLIGHT: [Role.SuperAdmin, Role.Admin, Role.Manager],
  DELETE_FLIGHT: [Role.SuperAdmin],
  REFUND_BOOKING: [Role.SuperAdmin, Role.Admin, Role.Manager],
  REQUEST_REFUND: [Role.SuperAdmin, Role.Admin, Role.Agent],
  APPROVE_REFUND_REQUEST: [Role.SuperAdmin, Role.Admin],
  CREATE_USER: [Role.SuperAdmin, Role.Manager],
  MODIFY_USER: [Role.SuperAdmin, Role.Manager],
  VIEW_USER: [Role.SuperAdmin, Role.Manager],
  DELETE_USER: [Role.SuperAdmin],
  CREATE_AGENT: [Role.SuperAdmin, Role.Admin, Role.Supervisor],
  MODIFY_AGENT: [Role.SuperAdmin, Role.Admin, Role.Supervisor],
  BOOK_FLIGHT: [
    Role.SuperAdmin,
    Role.Admin,
    Role.Agent,
    Role.Manager,
    Role.Supervisor,
  ],
  MODIFY_BOOKED_FLIGHT: [Role.SuperAdmin, Role.Admin, Role.Agent, Role.Manager],
  VIEW_BOOKED_FLIGHT: [
    Role.SuperAdmin,
    Role.Admin,
    Role.Agent,
    Role.Manager,
    Role.Supervisor,
  ],
  DELETE_BOOKED_FLIGHT: [Role.SuperAdmin],
};

const hasPermissionToCreateFlight = (role: Role) =>
  Permissions.CREATE_FLIGHT.includes(role);
const hasPermissionToModifyFlight = (role: Role) =>
  Permissions.MODIFY_FLIGHT.includes(role);
const hasPermissionToCancelFlight = (role: Role) =>
  Permissions.CANCEL_FLIGHT.includes(role);
const hasPermissionToRequestRefund = (role: Role) =>
  Permissions.REQUEST_REFUND.includes(role);
const hasPermissionToRefundBooking = (role: Role) =>
  Permissions.REFUND_BOOKING.includes(role);
const hasPermissionToApproveRefund = (role: Role) =>
  Permissions.APPROVE_REFUND_REQUEST.includes(role);
const hasPermissionToArchiveFlight = (role: Role) =>
  Permissions.ARCHIVE_FLIGHT.includes(role);
const hasPermissionToDeleteFlight = (role: Role) =>
  Permissions.DELETE_FLIGHT.includes(role);
const hasPermissionToCreateUser = (role: Role) =>
  Permissions.CREATE_USER.includes(role);
const hasPermissionToModifyUser = (role: Role) =>
  Permissions.MODIFY_USER.includes(role);
const hasPermissionToDeleteUser = (role: Role) =>
  Permissions.DELETE_USER.includes(role);
const hasPermissionToViewUser = (role: Role) =>
  Permissions.VIEW_USER.includes(role);
const hasPermissionToCreateAgent = (role: Role) =>
  Permissions.CREATE_AGENT.includes(role);
const hasPermissionToModifyAgent = (role: Role) =>
  Permissions.MODIFY_AGENT.includes(role);
const hasPermissionToBookFlight = (role: Role) =>
  Permissions.BOOK_FLIGHT.includes(role);
const hasPermissionToModifyBookedFlight = (role: Role) =>
  Permissions.MODIFY_BOOKED_FLIGHT.includes(role);
const hasPermissionToViewBookedFlight = (role: Role) =>
  Permissions.VIEW_BOOKED_FLIGHT.includes(role);
const hasPermissionToDeleteBookedFlight = (role: Role) =>
  Permissions.DELETE_BOOKED_FLIGHT.includes(role);

const hasAdminRole = (role: Role) => role === Role.Admin;
const hasSupervisorRole = (role: Role) => role === Role.Supervisor;
const hasManagerRole = (role: Role) => role === Role.Manager;
const hasSuperAdminRole = (role: Role) => role === Role.SuperAdmin;
const hasUserRole = (role: Role) => role === Role.User;
const hasAgentRole = (role: Role) => role === Role.Agent;

export {
  hasAdminRole,
  hasSupervisorRole,
  hasManagerRole,
  hasSuperAdminRole,
  hasUserRole,
  hasAgentRole,
  hasPermissionToCreateFlight,
  hasPermissionToModifyFlight,
  hasPermissionToCancelFlight,
  hasPermissionToApproveRefund,
  hasPermissionToArchiveFlight,
  hasPermissionToDeleteFlight,
  hasPermissionToRefundBooking,
  hasPermissionToCreateUser,
  hasPermissionToModifyUser,
  hasPermissionToDeleteUser,
  hasPermissionToViewUser,
  hasPermissionToCreateAgent,
  hasPermissionToModifyAgent,
  hasPermissionToBookFlight,
  hasPermissionToModifyBookedFlight,
  hasPermissionToViewBookedFlight,
  hasPermissionToDeleteBookedFlight,
  hasPermissionToRequestRefund,
};
