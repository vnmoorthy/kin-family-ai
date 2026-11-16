import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Kin Autopilot: follow up on open items and escalate to a parent when needed.
crons.interval("kin autopilot", { minutes: 5 }, internal.autopilot.sweep, {});
export default crons;
