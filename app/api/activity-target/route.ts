import { NextResponse } from "next/server";
import { activities, type Activity } from "@/app/activityTarget/data";
import { getActivityAchievementsFromDB } from "@/lib/activityTargets";

export async function GET() {
  try {
    const achievements = await getActivityAchievementsFromDB();

    const merged: Activity[] = activities.map((activity) => {
      const live = achievements[activity.slug];
      return {
        ...activity,
        achieved: live?.achieved ?? activity.achieved,
        // weekDelta belum dihitung otomatis; biarkan nilai statis dulu
      };
    });

    return NextResponse.json({ activities: merged });
  } catch (error) {
    console.error("/api/activity-target error", error);
    return NextResponse.json(
      { activities, error: "Failed to load activity achievements" },
      { status: 500 }
    );
  }
}
