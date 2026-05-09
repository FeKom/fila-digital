import { uuidv7 } from "uuidv7";
import { db } from "../../../infra/database/connect";
import { NewQueueSchedule, QueueSchedule } from "../../../infra/database/types";

export const createQueueSchedule = async (
  data: Omit<NewQueueSchedule, "id">
): Promise<QueueSchedule> => {
  return db
    .insertInto("queue_schedules")
    .values({ ...data, id: uuidv7() })
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const findScheduleByQueueId = async (
  queueId: string
): Promise<QueueSchedule | undefined> => {
  return db
    .selectFrom("queue_schedules")
    .selectAll()
    .where("queue_id", "=", queueId)
    .orderBy("created_at", "desc")
    .executeTakeFirst();
};

export const updateScheduleStatus = async (
  scheduleId: string,
  status: "active" | "inactive"
): Promise<void> => {
  await db
    .updateTable("queue_schedules")
    .set({ status, updated_at: new Date().toISOString() })
    .where("id", "=", scheduleId)
    .execute();
};
