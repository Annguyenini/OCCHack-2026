export type BackendSession = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  is_anonymous: boolean;
  token_type: string;
};

export type BackendProfileStats = {
  id: string;
  gender: string;
  muscularity_level: number;
  coins: number;
  exp: number;
  level: number;
};

export type BackendTask = {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  exp_reward: number;
  coin_reward: number;
  status: "remaining" | "completed";
  progress: number;
  is_active: boolean;
  assigned_at: string;
  completed_at: string | null;
  is_side_quest?: boolean;
  batch_id?: string | null;
};

export type CurrentTasksResponse = {
  date: string;
  count: number;
  tasks: BackendTask[];
};

export type CompletedTasksResponse = {
  count: number;
  limit: number;
  offset: number;
  tasks: BackendTask[];
};

export type BackendClothing = {
  id: string;
  name: string;
  category: string;
  price: number;
  created_at: string;
};

const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
const sessionStorageKey = "sidekick-backend-session";

function getSession(): BackendSession | null {
  const stored = window.localStorage.getItem(sessionStorageKey);
  return stored ? (JSON.parse(stored) as BackendSession) : null;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_URL is not configured");
  }

  const session = getSession();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function signInAnonymously(): Promise<BackendSession> {
  const existingSession = getSession();
  if (existingSession?.access_token) {
    return existingSession;
  }

  const session = await apiRequest<BackendSession>("/auth/anonymus", {
    method: "POST",
  });

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  return session;
}

export async function signOut(): Promise<void> {
  try {
    await apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  } finally {
    window.localStorage.removeItem(sessionStorageKey);
  }
}

export async function initializeProfile(name: string, gender: string) {
  return apiRequest<{ message: string; created: boolean; profile: unknown }>(
    "/user-stat/initialize",
    { method: "POST", body: JSON.stringify({ name, gender }) },
  );
}

export function getMyStats() {
  return apiRequest<BackendProfileStats>("/user-stat/");
}

export function updateMyCoins(amount: number) {
  return apiRequest<{
    message: string;
    previous_coins: number;
    change: number;
    coins: number;
  }>("/user-stat/coins", {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  });
}

export function getCurrentTasks() {
  return apiRequest<CurrentTasksResponse>("/user-tasks/current");
}

export function getCompletedTasks() {
  return apiRequest<CompletedTasksResponse>("/user-tasks/completed");
}

export function generateSideQuest(sideQuest: string, duration = 30) {
  return apiRequest<unknown>("/user-tasks/generate-task", {
    method: "POST",
    body: JSON.stringify({ side_quest: sideQuest, duration }),
  });
}

export function updateTaskStatus(
  taskId: string,
  status: BackendTask["status"],
) {
  return apiRequest<BackendTask>(
    `/user-tasks/${encodeURIComponent(taskId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function getMarketClothes() {
  return apiRequest<BackendClothing[]>("/market/clothes");
}

export function getMyClothes() {
  return apiRequest<
    Array<{
      id: string;
      clothing_id: string;
      quantity: number;
      is_equipped: boolean;
      clothes: BackendClothing;
    }>
  >("/market/my-clothes");
}

export function buyClothes(clothingId: string) {
  return apiRequest<{
    message: string;
    clothing: BackendClothing;
    coins_remaining: number;
  }>(`/market/clothes/${encodeURIComponent(clothingId)}/buy`, {
    method: "POST",
  });
}

export type MoneyPiratePrediction = "upper" | "below";

export type MoneyPirateSettlement = {
  message: string;
  coins: number;
  change: number;
  wager: number;
  player_total: number;
  host_total: number;
  won: boolean;
};

export function validateMoneyPirateWager(wager: number) {
  return apiRequest<{ valid: boolean; max_wager: number; coins: number }>(
    "/user-stat/money-pirate/validate-wager",
    { method: "POST", body: JSON.stringify({ wager }) },
  );
}

export function settleMoneyPirateGame(input: {
  wager: number;
  prediction: MoneyPiratePrediction;
  playerDice: [number, number];
  hostDice: [number, number];
}) {
  return apiRequest<MoneyPirateSettlement>("/user-stat/money-pirate/settle", {
    method: "POST",
    body: JSON.stringify({
      wager: input.wager,
      prediction: input.prediction,
      player_dice: input.playerDice,
      host_dice: input.hostDice,
    }),
  });
}

export function restartMoneyPirate() {
  return apiRequest<{ message: string; coins: number }>(
    "/user-stat/money-pirate/restart",
    { method: "POST" },
  );
}
