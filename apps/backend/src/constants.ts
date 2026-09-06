const ROUTES = {
  commerce: {
    register: "/commerce/register",
    list: "/commerce",
    nearby: "/commerce/nearby",
    searchQueues: "/procurar-fila",
    getById: "/commerce/:commerce_id",
    update: "/commerce/:commerce_id/update",
    delete: "/commerce/:commerce_id/delete",
    grantAdmin: "/commerce/:commerce_id/admins",
    revokeAdmin: "/commerce/:commerce_id/admins/:person_id",
    listAdmins: "/commerce/:commerce_id/admins",
  },
  queue: {
    register: "/queue/register",
    update: "/queue/:commerce_id/:queue_id/update",
    delete: "/queue/:commerce_id/:queue_id/delete",
    schedule: "/queue/:commerce_id/:queue_id/schedule",
    scheduleToggle:
      "/queue/:commerce_id/:queue_id/schedule/:schedule_id/toggle",
  },
  common: {
    health: "/healthcheck",
    livez: "/livez",
  },
  participantsQueue: {
    enter: "/participants-queue/enter/:commerce_id",
    enterByQrCode: "/enter-queue",
    list: "/participants-queue/:commerce_id",
    myPosition: "/participants-queue/:commerce_id/my-position",
    stream: "/participants-queue/:commerce_id/stream",
    next: "/participants-queue/:commerce_id/next",
    nextN: "/participants-queue/:commerce_id/next/:count",
    revert: "/participants-queue/:commerce_id/revert",
    revertN: "/participants-queue/:commerce_id/revert/:count",
    exit: "/participants-queue/:commerce_id/exit",
  },
  user: {
    register: "/user/register",
    login: "/user/login",
    google: "/user/google",
    refresh: "/user/refresh",
    logout: "/user/logout",
    details: "/user",
    commerces: "/user/commerces",
    queues: "/user/queues",
    update: "/user/update",
    delete: "/user/delete",
    claimAnonymous: "/user/claim-anonymous",
  },
};

export default ROUTES;
