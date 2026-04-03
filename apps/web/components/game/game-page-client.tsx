"use client";

import { GamePageContent } from "@/components/game/game-page-content";
import { useConvexConnectionState } from "convex/react";
import { useEffect, useRef, useState } from "react";

export interface GamePageClientProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
  /** Display name for the human player (e.g. email until usernames exist). */
  userDisplayName?: string;
}

/** When Convex WebSocket reconnects, remount game content so subscriptions get latest state. */
export function GamePageClient(props: GamePageClientProps) {
  const connectionState = useConvexConnectionState();
  const wasDisconnectedRef = useRef(false);
  const [connectionRefreshKey, setConnectionRefreshKey] = useState(0);
  const lastGameStatusRef = useRef<string | undefined>(undefined);
  const prevRouteGameIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const routeGameId = props.gameId;
    if (
      prevRouteGameIdRef.current !== undefined &&
      prevRouteGameIdRef.current !== routeGameId
    ) {
      lastGameStatusRef.current = undefined;
    }
    prevRouteGameIdRef.current = routeGameId;
  }, [props.gameId]);

  useEffect(() => {
    const connected = connectionState?.isWebSocketConnected ?? false;
    if (wasDisconnectedRef.current && connected) {
      setConnectionRefreshKey((prev) => prev + 1);
      wasDisconnectedRef.current = false;
    } else if (!connected) {
      wasDisconnectedRef.current = true;
    }
  }, [connectionState?.isWebSocketConnected]);

  return (
    <GamePageContent
      key={connectionRefreshKey}
      gameId={props.gameId}
      initialBoardOrientation={props.initialBoardOrientation}
      userDisplayName={props.userDisplayName}
      lastGameStatusRef={lastGameStatusRef}
    />
  );
}
