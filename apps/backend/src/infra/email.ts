import { Resend } from "resend";
import config from "./config";

const apiKey = config.get<string>("notifications.resend.apiKey");
export const fromEmail = config.get<string>("notifications.resend.fromEmail");

export const resend = new Resend(apiKey);
