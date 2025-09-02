import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to real-time updates for scene_versions.
 * @param sceneIds Array of scene IDs to watch.
 * @param onUpdate Callback when a version is inserted/updated/deleted.
 */
export function useSceneVersionsSubscription(
  sceneIds: string[],
  onUpdate: (change: { eventType: string; new: any; old: any }) => void
) {
  useEffect(() => {
    if (!sceneIds.length) return;

    const channel = supabase
      .channel("scene_versions_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scene_versions",
          filter: `scene_id=in.(${sceneIds.map((id) => `"${id}"`).join(",")})`,
        },
        (payload) => {
          onUpdate({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sceneIds, onUpdate]);
}