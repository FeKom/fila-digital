const ROUTES = {
  commerce: {
    register: "/commerce/register",
    list: "/commerce",
    update: "/commerce/:commerce_id/update",
    delete: "/commerce/:commerce_id/delete",
  },
  queue: {
    register: "/queue/register",
    update: "/queue/:commerce_id/:queue_id/update",
    delete: "/queue/:commerce_id/:queue_id/delete",
  },
  common: {
    health: "/healthcheck",
  },
  participantsQueue: {
    enter: "/participants-queue/enter/:commerce_id",
    enterByQrCode: "/enter-queue",
    list: "/participants-queue/:commerce_id",
    next: "/participants-queue/:commerce_id/next",
    nextN: "/participants-queue/:commerce_id/next/:count",
    exit: "/participants-queue/:commerce_id/exit",
  },
  user: {
    register: "/user/register",
    login: "/user/login",
    details: "/user",
    commerces: "/user/commerces",
    queues: "/user/queues",
    update: "/user/update",
    delete: "/user/delete",
  },
};

export default ROUTES;
