import { useEffect, useState, type ReactNode } from "react";
import {
  defaultAppContent,
  defaultOutfit,
  loadAppContent,
  resolveOutfit,
  type AppContent,
  type IconName,
  type Quest,
  type StoreItem,
} from "./contentService";
import {
  loadPlayerProfile,
  savePlayerProfile,
  clearPlayerProfile,
  type PlayerProfile,
} from "./profileService";
import {
  signInAnonymously,
  initializeProfile,
  getMyStats,
  getCurrentTasks,
  getCompletedTasks,
  settleMoneyPirateGame,
  updateMyCoins,
  validateMoneyPirateWager,
  restartMoneyPirate,
  generateSideQuest as requestSideQuest,
  updateTaskStatus,
  getMarketClothes,
  getMyClothes,
  buyClothes,
  signOut as signOutBackend,
  type BackendClothing,
} from "./backendApi";

const iconPaths: Record<IconName, ReactNode> = {
  bag: (
    <>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </>
  ),
  bolt: <path d="m13 2-8 11h7l-1 9 8-12h-7l1-8Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 8.5c-.6-.5-1.4-.8-2.5-.8-1.7 0-2.8.8-2.8 2s1 1.8 2.8 2.3 2.8 1.1 2.8 2.3-1.1 2-2.8 2c-1.1 0-2.1-.4-2.8-1M12 6v12" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  leaf: (
    <path d="M20 4C12 4 5 7 5 14c0 3 2 5 5 5 7 0 10-7 10-15ZM4 21c2-5 6-8 11-11" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  shirt: <path d="m8 4-5 3 3 5 2-1v9h8v-9l2 1 3-5-5-3a4 4 0 0 1-8 0Z" />,
  spark: (
    <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.7M16 3.3a4 4 0 0 1 0 7.4" />
    </>
  ),
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {iconPaths[name]}
      </g>
    </svg>
  );
}

function Button({
  children,
  className = "",
  onClick,
  ariaLabel,
  ariaPressed,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  ariaPressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`button ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Character({
  gender,
  outfit,
  catalog,
}: {
  gender: "woman" | "man";
  outfit: string;
  catalog: StoreItem[];
}) {
  const item = resolveOutfit(outfit, catalog);
  const colors = item.style;
  const isHoodie = colors.variant === "hoodie";
  const isJacket = colors.variant === "jacket";
  const isOveralls = colors.variant === "overalls";
  const isTracksuit = colors.variant === "tracksuit";
  const isVest = colors.variant === "vest";
  const isTank = colors.variant === "tank";
  const isShorts = colors.variant === "shorts";
  const isBaggy = colors.variant === "baggy";

  return (
    <svg
      className="character-svg"
      viewBox="0 0 240 300"
      role="img"
      aria-label={`${gender} character wearing ${outfit}`}
    >
      <ellipse cx="120" cy="282" rx="61" ry="10" fill="#dfe0e6" />
      {isShorts ? (
        <>
          <path
            d="M86 190h68l2 38-27 1-9-29-9 29-27-1Z"
            fill={colors.pants}
            stroke="#232536"
            strokeWidth="3"
          />
          <path
            d="M91 228h20l-1 40H84ZM129 228h20l7 40h-26Z"
            fill="#c8896e"
            stroke="#232536"
            strokeWidth="3"
          />
        </>
      ) : (
        <path
          d={
            isBaggy
              ? "M82 188h76l8 80h-38l-8-66-8 66H74Z"
              : "M89 190 82 268h29l9-69 9 69h29l-7-78Z"
          }
          fill={colors.pants}
          stroke={isBaggy ? "#232536" : "none"}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {isTracksuit && (
        <path
          d="M98 199 94 260M142 199l4 61"
          stroke={colors.secondary}
          strokeWidth="5"
        />
      )}
      <path
        d="M78 266h35v13H72c-3-7 0-11 6-13ZM127 266h35c6 2 9 6 6 13h-41Z"
        fill="#f7f7f9"
        stroke="#232536"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M89 116c-20 7-28 31-33 65l17 4 16-41Z"
        fill={isTank ? "#c8896e" : colors.primary}
        stroke="#232536"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M151 116c20 7 28 31 33 65l-17 4-16-41Z"
        fill={isTank ? "#c8896e" : colors.primary}
        stroke="#232536"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle
        cx="64"
        cy="186"
        r="10"
        fill="#b9785f"
        stroke="#232536"
        strokeWidth="3"
      />
      <circle
        cx="176"
        cy="186"
        r="10"
        fill="#b9785f"
        stroke="#232536"
        strokeWidth="3"
      />

      <path
        d="M87 113c18-8 48-8 66 0l7 86H80Z"
        fill={colors.primary}
        stroke="#232536"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {isTank && (
        <path
          d="M100 109c4 15 36 15 40 0l8 90H92Z"
          fill={colors.primary}
          stroke="#232536"
          strokeWidth="3"
        />
      )}
      {isHoodie && (
        <>
          <path
            d="M94 116c4-18 48-18 52 0l-9 16h-34Z"
            fill={colors.secondary}
            stroke="#232536"
            strokeWidth="3"
          />
          <path
            d="M113 127v28M127 127v28"
            stroke="#f7f7f9"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M99 171h42v17H99Z" fill={colors.secondary} opacity=".55" />
        </>
      )}
      {isJacket && (
        <>
          <path
            d="M120 110v89M91 119l20 18 9-20 9 20 20-18"
            fill={colors.secondary}
            stroke="#232536"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M86 173h27M127 173h27"
            stroke={colors.secondary}
            strokeWidth="5"
          />
        </>
      )}
      {isOveralls && (
        <>
          <path
            d="M99 113v28h42v-28M96 136h48v63H96Z"
            fill={colors.pants}
            stroke="#232536"
            strokeWidth="3"
          />
          <path d="M111 153h18v15h-18Z" fill={colors.secondary} />
          <circle cx="103" cy="139" r="3" fill="#f5dd7d" />
          <circle cx="137" cy="139" r="3" fill="#f5dd7d" />
        </>
      )}
      {isTracksuit && (
        <>
          <path d="M120 110v89" stroke={colors.secondary} strokeWidth="4" />
          <path
            d="M83 137h17M140 137h17"
            stroke={colors.secondary}
            strokeWidth="5"
          />
        </>
      )}
      {isVest && (
        <>
          <path
            d="M94 112h52l6 82h-64Z"
            fill={colors.primary}
            stroke="#232536"
            strokeWidth="3"
          />
          <path
            d="M120 113v81M96 151h18v16H96M126 151h18v16h-18"
            fill="none"
            stroke={colors.secondary}
            strokeWidth="4"
          />
        </>
      )}

      <path
        d="M109 96v20c3 8 19 8 22 0V96Z"
        fill="#b9785f"
        stroke="#232536"
        strokeWidth="3"
      />
      {gender === "woman" ? (
        <path
          d="M82 62c0-31 76-38 81 5l-3 53-17-12-47 3-16 12Z"
          fill="#342d3b"
          stroke="#232536"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M86 64c2-34 69-37 70 1l-9-8-8 4-9-7-10 7-12-6-12 10Z"
          fill="#342d3b"
          stroke="#232536"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      <ellipse
        cx="120"
        cy="77"
        rx="33"
        ry="36"
        fill="#c8896e"
        stroke="#232536"
        strokeWidth="3"
      />
      {gender === "woman" ? (
        <path
          d="M88 67c4-35 61-43 68-5-21-10-39-9-68 5Z"
          fill="#342d3b"
          stroke="#232536"
          strokeWidth="3"
        />
      ) : (
        <path
          d="M88 64c4-31 57-40 67-4-12 1-22-1-31-8-8 8-19 11-36 12Z"
          fill="#342d3b"
          stroke="#232536"
          strokeWidth="3"
        />
      )}
      <path
        d="M104 78h7M129 78h7"
        stroke="#232536"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M111 94c6 5 12 5 18 0"
        fill="none"
        stroke="#713f3c"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type PiratePrediction = "upper" | "below";
type PirateStage =
  | "betting"
  | "round-two"
  | "validating-first"
  | "validating-second"
  | "rolling-first"
  | "rolling-second";
type PirateHistoryEntry = {
  playerTotal: number;
  hostTotal: number;
  wager: number;
  won: boolean;
  prediction: PiratePrediction;
};

const fruitDice = [
  "🍒",
  "🍉 🍉",
  "🍎 🍎 🍎",
  "🍇 🍇 🍇 🍇",
  "🍊 🍊 🍊 🍊 🍊",
  "🍌 🍌 🍌 🍌 🍌 🍌",
];

function playPirateSound(kind: "roll" | "win" | "loss", enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return;
  try {
    const context = new window.AudioContext();
    const notes =
      kind === "roll"
        ? [190, 260, 210, 300, 230]
        : kind === "win"
          ? [520, 660, 790]
          : [330, 260, 190];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "roll" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime + index * (kind === "roll" ? 0.16 : 0.12),
      );
      gain.gain.exponentialRampToValueAtTime(
        0.08,
        context.currentTime + index * (kind === "roll" ? 0.16 : 0.12) + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + index * (kind === "roll" ? 0.16 : 0.12) + 0.11,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(
        context.currentTime + index * (kind === "roll" ? 0.16 : 0.12),
      );
      oscillator.stop(
        context.currentTime + index * (kind === "roll" ? 0.16 : 0.12) + 0.12,
      );
    });
    window.setTimeout(() => void context.close(), 1100);
  } catch {
    // Audio is optional; a browser may block it before the first gesture.
  }
}

export default function App() {
  const [content, setContent] = useState<AppContent>(defaultAppContent);
  const [quests, setQuests] = useState<Quest[]>(defaultAppContent.quests);
  const [activeNav, setActiveNav] = useState("Today");
  const [claimed, setClaimed] = useState(false);
  const [toast, setToast] = useState("");
  const [coins, setCoins] = useState(defaultAppContent.economy.startingCoins);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [marketClothes, setMarketClothes] = useState<BackendClothing[]>([]);
  const [gender, setGender] = useState<"woman" | "man">("man");
  const [equipped, setEquipped] = useState("Everyday tee");
  const [playerName, setPlayerName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [generatePromptOpen, setGeneratePromptOpen] = useState(false);
  const [sideQuestDraft, setSideQuestDraft] = useState("");
  const [generatingTask, setGeneratingTask] = useState(false);
  const [hasGeneratedTask, setHasGeneratedTask] = useState(
    () => window.localStorage.getItem("sidekick-generated-task") === "true",
  );
  const [activePirateGame, setActivePirateGame] = useState<"dice" | "coin">("dice");
  const [coinFlipBet, setCoinFlipBet] = useState("10");
  const [coinFlipChoice, setCoinFlipChoice] = useState<"heads" | "tails">("heads");
  const [coinFlipBusy, setCoinFlipBusy] = useState(false);
  const [coinFlipResult, setCoinFlipResult] = useState<{
    face: "heads" | "tails";
    won: boolean;
    bet: number;
  } | null>(null);
  const [coinFlipError, setCoinFlipError] = useState("");
  const [pirateStage, setPirateStage] = useState<PirateStage>("betting");
  const [piratePrediction, setPiratePrediction] =
    useState<PiratePrediction>("upper");
  const [pirateBetDraft, setPirateBetDraft] = useState("10");
  const [pirateAddDraft, setPirateAddDraft] = useState("10");
  const [pirateWager, setPirateWager] = useState(0);
  const [playerDice, setPlayerDice] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [hostDice, setHostDice] = useState<[number | null, number | null]>([
    null,
    null,
  ]);
  const [pirateError, setPirateError] = useState("");
  const [piratePayout, setPiratePayout] = useState<{
    won: boolean;
    amount: number;
  } | null>(null);
  const [pirateHistory, setPirateHistory] = useState<PirateHistoryEntry[]>([]);
  const [showPirateHelp, setShowPirateHelp] = useState(false);
  const [pirateSoundEnabled, setPirateSoundEnabled] = useState(true);
  const pirateBusy =
    pirateStage === "validating-first" ||
    pirateStage === "validating-second" ||
    pirateStage === "rolling-first" ||
    pirateStage === "rolling-second" ||
    coinFlipBusy;
  const pirateMaxWager = Math.min(100, Math.max(0, coins + 50));
  const pirateGameOver = pirateMaxWager < 10;

  useEffect(() => {
    if (!piratePayout) return;
    const timer = window.setTimeout(() => setPiratePayout(null), 4500);
    return () => window.clearTimeout(timer);
  }, [piratePayout]);

  const completed = quests.filter((quest) => quest.done).length;
  const completionPercent = quests.length
    ? Math.round((completed / quests.length) * 100)
    : 0;
  const refreshTaskData = async () => {
    const [stats, currentTasks, completedTasks] = await Promise.all([
      getMyStats(),
      getCurrentTasks(),
      getCompletedTasks(),
    ]);
    setCoins(stats.coins);
    setQuests([
      ...currentTasks.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        detail: task.description,
        coinReward: task.coin_reward,
        category: "Quest",
        icon: "bolt" as const,
        tone: "lilac",
        done: false,
      })),
      ...completedTasks.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        detail: task.description,
        coinReward: task.coin_reward,
        category: "Quest",
        icon: "bolt" as const,
        tone: "lilac",
        done: true,
      })),
    ]);
  };

  const refreshBackendData = async () => {
    const [clothes, inventory] = await Promise.all([
      getMarketClothes(),
      getMyClothes(),
    ]);
    await refreshTaskData();
    setMarketClothes(clothes);
    setPurchased(inventory.map((entry) => entry.clothes.name));
  };

  useEffect(() => {
    Promise.all([
      loadAppContent().catch(() => defaultAppContent),
      loadPlayerProfile().catch(() => null),
    ])
      .then(async ([nextContent, profile]) => {
        setContent(nextContent);
        setQuests(
          nextContent.quests.map((quest) => ({
            ...quest,
            done:
              typeof quest.id === "number" && profile?.completedQuestIds
                ? profile.completedQuestIds.includes(quest.id)
                : quest.done,
          })),
        );
        setCoins(profile?.coins ?? nextContent.economy.startingCoins);

        if (profile) {
          setPlayerName(profile.name);
          setNameDraft(profile.name);
          setPurchased(profile.purchased ?? []);
          setEquipped(profile.equipped ?? defaultOutfit.name);
          setGender(profile.gender ?? "man");
          setClaimed(profile.bonusClaimed ?? false);
        }

        try {
          if (profile?.name) {
            await signInAnonymously();
            await initializeProfile(profile.name, profile.gender ?? "man");
            await refreshBackendData();
          }
        } catch (error) {
          console.error("Could not load backend stats:", error);
        }
      })
      .finally(() => setProfileReady(true));
  }, []);

  useEffect(() => {
    if (!playerName || !profileReady) return;

    const profile: PlayerProfile = {
      name: playerName,
      coins,
      purchased,
      equipped,
      gender,
      completedQuestIds: quests
        .filter((quest) => quest.done && typeof quest.id === "number")
        .map((quest) => quest.id as number),
      bonusClaimed: claimed,
    };
    savePlayerProfile(profile).catch(() => {
      setToast("Profile saved locally; backend sync is unavailable");
      window.setTimeout(() => setToast(""), 2400);
    });
  }, [
    claimed,
    coins,
    equipped,
    gender,
    playerName,
    profileReady,
    purchased,
    quests,
  ]);

  const toggleQuest = async (id: Quest["id"]) => {
    const quest = quests.find((item) => item.id === id);
    if (!quest) return;

    if (typeof id === "string") {
      const nextStatus = quest.done ? "remaining" : "completed";
      try {
        await updateTaskStatus(id, nextStatus);
      } catch (error) {
        console.error("Could not update backend task:", error);
        setToast("Could not complete this quest. Please try again.");
        window.setTimeout(() => setToast(""), 2400);
        return;
      }

      try {
        await refreshTaskData();
        setToast(
          nextStatus === "completed" ? "Quest completed!" : "Quest restored",
        );
      } catch (error) {
        console.error("Could not refresh backend tasks:", error);
        setToast("Quest updated, but the task list could not refresh.");
      }
      window.setTimeout(() => setToast(""), 2400);
      return;
    }

    setQuests((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
    if (!quest.done) {
      setCoins((current) => current + content.economy.coinsPerQuest);
      setToast("Nice work — quest completed!");
      window.setTimeout(() => setToast(""), 2400);
    } else {
      setCoins((current) =>
        Math.max(0, current - content.economy.coinsPerQuest),
      );
    }
  };

  const startJourney = async () => {
    const name = nameDraft.trim();
    if (!name) return;

    try {
      await signInAnonymously();
      await initializeProfile(name, gender);
      setPlayerName(name);
      await refreshBackendData();
    } catch (error) {
      console.error("Could not initialize backend profile:", error);
      setToast("Could not create your profile. Please try again.");
      window.setTimeout(() => setToast(""), 2400);
    }
  };

  const generateTask = async () => {
    const sideQuest = sideQuestDraft.trim();
    if (!sideQuest || generatingTask) return;

    setGeneratingTask(true);
    try {
      await requestSideQuest(sideQuest, 30);
      window.localStorage.setItem("sidekick-generated-task", "true");
      setHasGeneratedTask(true);
      setGeneratePromptOpen(false);
      setSideQuestDraft("");
      window.location.reload();
    } catch (error) {
      console.error("Could not generate side quest:", error);
      setToast("Could not generate your side quest. Please try again.");
      window.setTimeout(() => setToast(""), 2400);
    } finally {
      setGeneratingTask(false);
    }
  };

  const playCoinFlip = async () => {
    const bet = Number(coinFlipBet);
    if (!Number.isInteger(bet) || bet < 1 || bet > coins) {
      setCoinFlipError("Enter a whole coin amount within your balance.");
      return;
    }
    if (coinFlipBusy || pirateStage !== "betting") return;

    setCoinFlipBusy(true);
    setCoinFlipError("");
    setCoinFlipResult(null);
    const face = Math.random() < 0.5 ? "heads" : "tails";
    const won = face === coinFlipChoice;
    playPirateSound("roll", pirateSoundEnabled);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      const updated = await updateMyCoins(won ? bet : -bet);
      setCoins(updated.coins);
      setCoinFlipResult({ face, won, bet });
      playPirateSound(won ? "win" : "loss", pirateSoundEnabled);
    } catch (error) {
      console.error("Could not update coins for coin flip:", error);
      setCoinFlipError("The coin flip could not be saved. Please try again.");
    } finally {
      setCoinFlipBusy(false);
    }
  };

  const startPirateGame = async () => {
    const wager = Number(pirateBetDraft);
    if (
      !Number.isInteger(wager) ||
      wager < 10 ||
      wager % 10 !== 0 ||
      wager > 100 ||
      wager > pirateMaxWager
    ) {
      setPirateError(
        `Enter a multiple of 10 from 10 to ${pirateMaxWager} coins.`,
      );
      return;
    }
    if (pirateBusy || pirateGameOver) return;

    setPirateError("");
    setPirateStage("validating-first");
    try {
      await validateMoneyPirateWager(wager);
    } catch (error) {
      setPirateError(
        error instanceof Error ? error.message : "Your wager is not valid.",
      );
      setPirateStage("betting");
      return;
    }
    setPirateWager(wager);
    setPiratePayout(null);
    setPlayerDice([null, null]);
    setHostDice([null, null]);
    setPirateStage("rolling-first");
    playPirateSound("roll", pirateSoundEnabled);
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    setPlayerDice([1 + Math.floor(Math.random() * 6), null]);
    setHostDice([1 + Math.floor(Math.random() * 6), null]);
    setPirateStage("round-two");
  };

  const rollPirateSecondDice = async (action: "stand" | "add" | "double") => {
    if (pirateStage !== "round-two" || pirateBusy) return;
    let finalWager = pirateWager;
    if (action === "add") {
      const addition = Number(pirateAddDraft);
      if (!Number.isInteger(addition) || addition <= 0 || addition % 10 !== 0) {
        setPirateError("Add a positive multiple of 10 coins.");
        return;
      }
      finalWager += addition;
    } else if (action === "double") {
      finalWager *= 2;
    }
    if (finalWager > 100 || finalWager > pirateMaxWager) {
      setPirateError(`Your total wager cannot exceed ${pirateMaxWager} coins.`);
      return;
    }

    setPirateError("");
    setPirateStage("validating-second");
    try {
      await validateMoneyPirateWager(finalWager);
    } catch (error) {
      setPirateError(
        error instanceof Error ? error.message : "Your wager is not valid.",
      );
      setPirateStage("round-two");
      return;
    }
    setPirateWager(finalWager);
    setPirateStage("rolling-second");
    playPirateSound("roll", pirateSoundEnabled);
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    const finalPlayerDice: [number, number] = [
      playerDice[0] ?? 1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
    ];
    const finalHostDice: [number, number] = [
      hostDice[0] ?? 1 + Math.floor(Math.random() * 6),
      1 + Math.floor(Math.random() * 6),
    ];
    setPlayerDice(finalPlayerDice);
    setHostDice(finalHostDice);

    try {
      const settled = await settleMoneyPirateGame({
        wager: finalWager,
        prediction: piratePrediction,
        playerDice: finalPlayerDice,
        hostDice: finalHostDice,
      });
      setCoins(settled.coins);
      setPiratePayout({ won: settled.won, amount: finalWager });
      setPirateHistory((history) =>
        [
          {
            playerTotal: settled.player_total,
            hostTotal: settled.host_total,
            wager: finalWager,
            won: settled.won,
            prediction: piratePrediction,
          },
          ...history,
        ].slice(0, 8),
      );
      playPirateSound(settled.won ? "win" : "loss", pirateSoundEnabled);
      setPirateStage("betting");
      setPirateBetDraft("10");
    } catch (error) {
      console.error("Could not settle Money Pirate wager:", error);
      setPirateError(
        error instanceof Error
          ? error.message
          : "Could not settle this wager. Please try again.",
      );
      setPirateStage("round-two");
    }
  };

  const handlePirateRestart = async () => {
    if (pirateBusy || coinFlipBusy) return;
    try {
      const result = await restartMoneyPirate();
      setCoins(result.coins);
      setPirateStage("betting");
      setPirateBetDraft("10");
      setPirateAddDraft("10");
      setPirateWager(0);
      setPlayerDice([null, null]);
      setHostDice([null, null]);
      setPirateHistory([]);
      setPiratePayout(null);
      setPirateError("");
      setCoinFlipResult(null);
      setCoinFlipError("");
      setCoinFlipBet("10");
    } catch (error) {
      console.error("Could not restart Money Pirate:", error);
      setPirateError("Could not reset the backend balance. Please try again.");
    }
  };

  const handleSignOut = async () => {
    let serverSignedOut = true;
    try {
      await signOutBackend();
    } catch (error) {
      serverSignedOut = false;
      console.error("Could not invalidate backend session:", error);
    }

    clearPlayerProfile();
    window.localStorage.removeItem("sidekick-generated-task");
    setHasGeneratedTask(false);
    setPlayerName("");
    setNameDraft("");
    setCoins(defaultAppContent.economy.startingCoins);
    setQuests(defaultAppContent.quests);
    setClaimed(false);
    setPurchased([]);
    setMarketClothes([]);
    setEquipped(defaultOutfit.name);
    setGender("man");
    setActiveNav("Today");
    setToast(serverSignedOut ? "Signed out" : "Signed out on this device");
    window.setTimeout(() => setToast(""), 2400);
  };

  const storeItems: StoreItem[] =
    marketClothes.length > 0
      ? marketClothes.map((clothing, index) => {
          const localItem =
            content.storeItems.find(
              (item) => item.name.toLowerCase() === clothing.name.toLowerCase(),
            ) ??
            content.storeItems[index % content.storeItems.length] ??
            defaultOutfit;
          const validCategories: StoreItem["category"][] = [
            "casual",
            "formal",
            "semi-formal",
            "sport",
          ];
          const category = validCategories.includes(
            clothing.category as StoreItem["category"],
          )
            ? (clothing.category as StoreItem["category"])
            : localItem.category;

          return {
            ...localItem,
            id: clothing.id,
            name: clothing.name,
            price: clothing.price,
            category,
          };
        })
      : content.storeItems;

  const buyItem = async (item: StoreItem) => {
    if (purchased.includes(item.name)) return;
    if (coins < item.price) {
      setToast("Not enough coins yet — complete more quests");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }

    if (typeof item.id === "string") {
      try {
        const result = await buyClothes(item.id);
        setCoins(result.coins_remaining);
        setPurchased((current) => [...current, item.name]);
        setEquipped(item.name);
        setToast(`${item.name} added to your collection`);
      } catch (error) {
        console.error("Could not purchase backend clothing:", error);
        setToast("Could not complete this purchase. Please try again.");
      }
      window.setTimeout(() => setToast(""), 2400);
      return;
    }

    setCoins((current) => current - item.price);
    setPurchased((current) => [...current, item.name]);
    setEquipped(item.name);
    setToast(`${item.name} added to your collection`);
    window.setTimeout(() => setToast(""), 2400);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="bolt" size={19} />
          </div>
          <span>LevelUP</span>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {[
            ["Today", "home"],
            ["My quests", "target"],
            ["Store", "bag"],
            ["Playground", "spark"],
          ].map(([label, icon]) => (
            <Button
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              key={label}
              onClick={() => setActiveNav(label)}
            >
              <Icon name={icon as IconName} />
              <span>{label}</span>
              {label === "My quests" && (
                <span className="nav-count">
                  {quests.filter((quest) => !quest.done).length}
                </span>
              )}
            </Button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="player-profile">
            <div className="avatar">
              {playerName ? playerName.slice(0, 2).toUpperCase() : "SK"}
            </div>
            <div>
              <strong>{playerName || "New explorer"}</strong>
              <span>LevelUP player</span>
            </div>
            <Button
              ariaLabel="Sign out"
              className="sign-out-button"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="main">
        {activeNav !== "Playground" && (
          <header className="topbar">
            <Button className="mobile-logo" ariaLabel="Open navigation">
              <Icon name="bolt" />
            </Button>
            <Button
              className="coin-balance"
              onClick={() => setActiveNav("Store")}
            >
              <span className="coin-icon">
                <Icon name="coin" size={16} />
              </span>
              <strong>{coins}</strong>
              <span>coins</span>
            </Button>
          </header>
        )}

        <div className="content">
          {activeNav === "Store" ? (
            <section className="store-view">
              <div className="store-hero">
                <div>
                  <span className="eyebrow">LevelUP STORE</span>
                  <h1>Dress your character.</h1>
                  <p>
                    Turn real-life wins into fresh looks for your character.
                  </p>
                </div>
                <div className="wallet-card">
                  <span className="wallet-icon">
                    <Icon name="coin" size={26} />
                  </span>
                  <div>
                    <span>YOUR BALANCE</span>
                    <strong>{coins.toLocaleString()} coins</strong>
                  </div>
                </div>
              </div>

              <div className="store-toolbar">
                <div>
                  <h2>Clothing collection</h2>
                  <p>Every purchase equips immediately.</p>
                </div>
                <span className="refresh-note">New items in 2d 14h</span>
              </div>

              <div className="store-catalog">
                {content.storeCategories.map((category) => (
                  <section className="store-category" key={category.id}>
                    <div className="category-header">
                      <div>
                        <span>{category.id.toUpperCase()}</span>
                        <h2>{category.label}</h2>
                        <p>{category.description}</p>
                      </div>
                      <strong>
                        {
                          storeItems.filter(
                            (item) => item.category === category.id,
                          ).length
                        }{" "}
                        pieces
                      </strong>
                    </div>
                    <div className="product-grid">
                      {storeItems
                        .filter((item) => item.category === category.id)
                        .map((item) => {
                          const owned = purchased.includes(item.name);
                          const affordable = coins >= item.price;
                          return (
                            <article className="product-card" key={item.name}>
                              <div className={`product-art ${item.tone}`}>
                                <span className="product-orbit" />
                                <div className="product-icon">
                                  <Icon name={item.icon} size={34} />
                                </div>
                                {item.featured && (
                                  <span className="popular-tag">FEATURED</span>
                                )}
                              </div>
                              <div className="product-copy">
                                <h3>{item.name}</h3>
                                <p>{item.description}</p>
                                <div className="product-footer">
                                  <span className="price">
                                    <Icon name="coin" size={15} />
                                    {item.price}
                                  </span>
                                  <Button
                                    className={`buy-button ${
                                      owned ? "owned" : ""
                                    }`}
                                    disabled={owned}
                                    onClick={() => void buyItem(item)}
                                  >
                                    {owned ? (
                                      <>
                                        <Icon name="check" size={15} /> Owned
                                      </>
                                    ) : affordable ? (
                                      "Buy now"
                                    ) : (
                                      "Need more"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="earn-banner">
                <div className="earn-icon">
                  <Icon name="target" size={25} />
                </div>
                <div>
                  <h2>Need more coins?</h2>
                  <p>Complete today&apos;s quests to build your balance.</p>
                </div>
                <Button
                  className="earn-button"
                  onClick={() => setActiveNav("Today")}
                >
                  View today&apos;s quests <Icon name="chevron" size={16} />
                </Button>
              </div>
            </section>
          ) : activeNav === "My quests" ? (
            <section className="my-quests-view">
              <div className="quests-page-header">
                <div>
                  <span className="eyebrow">QUEST LOG</span>
                  <h1>My quests</h1>
                  <p>
                    Everything you&apos;re working toward, all in one place.
                  </p>
                </div>
                {!hasGeneratedTask && (
                  <Button
                    className="primary-button"
                    onClick={() => setGeneratePromptOpen(true)}
                  >
                    <Icon name="spark" size={18} />
                    <span>Generate tasks</span>
                  </Button>
                )}
              </div>

              <div className="quest-summary-grid">
                <article>
                  <span className="summary-icon current">
                    <Icon name="target" size={19} />
                  </span>
                  <div>
                    <strong>
                      {quests.filter((quest) => !quest.done).length}
                    </strong>
                    <span>Current quests</span>
                  </div>
                </article>
                <article>
                  <span className="summary-icon completed">
                    <Icon name="check" size={19} />
                  </span>
                  <div>
                    <strong>
                      {quests.filter((quest) => quest.done).length}
                    </strong>
                    <span>Completed</span>
                  </div>
                </article>
              </div>

              {/*<section className="bonus-quest-panel">
                <div className="bonus-symbol">
                  <Icon name="spark" size={30} />
                </div>
                <div className="bonus-quest-copy">
                  <span>BONUS QUEST</span>
                  <h2>{content.bonusQuest.title}</h2>
                  <p>{content.bonusQuest.detail}</p>
                </div>
                <div className="bonus-rewards">
                  <span>
                    <Icon name="coin" size={14} /> +{content.bonusQuest.coins}
                  </span>
                </div>
                <Button
                  className={`bonus-action ${claimed ? "claimed" : ""}`}
                  disabled={claimed}
                  onClick={() => {
                    setClaimed(true);
                    setCoins((current) => current + content.bonusQuest.coins);
                    setToast(
                      `Bonus complete — +${content.bonusQuest.coins} coins`,
                    );
                    window.setTimeout(() => setToast(""), 2400);
                  }}
                >
                  <Icon name={claimed ? "check" : "bolt"} size={16} />
                  {claimed ? "Completed" : "Complete quest"}
                </Button>
              </section>*/}

              <div className="quest-board">
                <section className="quest-column">
                  <div className="quest-column-heading">
                    <div>
                      <span className="heading-dot active" />
                      <h2>Current quests</h2>
                    </div>
                    <span>
                      {quests.filter((quest) => !quest.done).length} active
                    </span>
                  </div>
                  <div className="quest-column-list">
                    {quests
                      .filter((quest) => !quest.done)
                      .map((quest) => (
                        <article className="quest-log-card" key={quest.id}>
                          <div className={`quest-icon ${quest.tone}`}>
                            <Icon name={quest.icon} />
                          </div>
                          <div className="quest-log-copy">
                            <div>
                              <span className="category">{quest.category}</span>
                              {typeof quest.coinReward === "number" && (
                                <span className="coin-reward-badge">
                                  <Icon name="coin" size={12} />+
                                  {quest.coinReward} coins
                                </span>
                              )}
                            </div>
                            <h3>{quest.title}</h3>
                            <p>{quest.detail}</p>
                          </div>
                          <Button
                            ariaLabel={`Complete ${quest.title}`}
                            className="log-complete-button"
                            onClick={() => toggleQuest(quest.id)}
                          >
                            <Icon name="check" size={17} />
                          </Button>
                        </article>
                      ))}
                    {quests.every((quest) => quest.done) && (
                      <div className="empty-quests">
                        <Icon name="spark" size={23} />
                        <strong>All clear</strong>
                        <span>You completed every current quest.</span>
                      </div>
                    )}
                  </div>
                </section>

                <section className="quest-column">
                  <div className="quest-column-heading">
                    <div>
                      <span className="heading-dot done" />
                      <h2>Completed quests</h2>
                    </div>
                    <span>
                      {quests.filter((quest) => quest.done).length} total
                    </span>
                  </div>
                  <div className="quest-column-list">
                    {quests
                      .filter((quest) => quest.done)
                      .map((quest) => (
                        <article
                          className="quest-log-card completed"
                          key={quest.id}
                        >
                          <div className={`quest-icon ${quest.tone}`}>
                            <Icon name="check" />
                          </div>
                          <div className="quest-log-copy">
                            <div>
                              <span className="category">{quest.category}</span>
                              {typeof quest.coinReward === "number" && (
                                <span className="coin-reward-badge">
                                  <Icon name="coin" size={12} />+
                                  {quest.coinReward} coins
                                </span>
                              )}
                            </div>
                            <h3>{quest.title}</h3>
                            <p>{quest.detail}</p>
                          </div>
                          <Button
                            ariaLabel={`Restore ${quest.title}`}
                            className="restore-button"
                            onClick={() => toggleQuest(quest.id)}
                          >
                            Restore
                          </Button>
                        </article>
                      ))}
                  </div>
                </section>
              </div>
            </section>
          ) : activeNav === "Playground" ? (
            <section className="playground-view money-pirate-view">
              <div className="pirate-topbar">
                <div className="pirate-wallets">
                  <div
                    className={`pirate-status-card balance-card ${piratePayout ? "balance-pulse" : ""}`}
                  >
                    <span>Your balance</span>
                    <strong>{coins} coins</strong>
                    {piratePayout && (
                      <span
                        key={`${piratePayout.amount}-${piratePayout.won}-${coins}`}
                        className={`pirate-payout ${piratePayout.won ? "won" : "lost"}`}
                      >
                        {piratePayout.won ? "+" : "−"}
                        {piratePayout.amount} coins
                      </span>
                    )}
                  </div>
                  <div className="pirate-status-card">
                    <span>Total bet</span>
                    <strong>{activePirateGame === "dice" ? pirateWager : Number(coinFlipBet) || 0} coins</strong>
                  </div>
                </div>
                <div className="pirate-top-actions">
                  <div className="pirate-status-card stage-card">
                    <span>Stage</span>
                    <strong>
                      {activePirateGame === "coin" ? "Coin flip" : pirateStage === "betting" ||
                      pirateStage === "validating-first" ||
                      pirateStage === "rolling-first"
                        ? "Round 1"
                        : "Round 2"}
                    </strong>
                  </div>
                  <button
                    className={`pirate-sound-button ${pirateSoundEnabled ? "sound-on" : ""}`}
                    onClick={() => setPirateSoundEnabled((enabled) => !enabled)}
                    aria-label={
                      pirateSoundEnabled ? "Mute sounds" : "Enable sounds"
                    }
                  >
                    Sound: {pirateSoundEnabled ? "on" : "off"}
                  </button>
                  <button
                    className="pirate-help-button"
                    onClick={() => setShowPirateHelp((open) => !open)}
                    aria-label="Money Pirate rules and history"
                  >
                    ?
                  </button>
                </div>
              </div>
              <div className="pirate-game-switch" role="group" aria-label="Choose a game">
                <Button ariaPressed={activePirateGame === "dice"} className={activePirateGame === "dice" ? "selected" : ""} onClick={() => setActivePirateGame("dice")}>Dice game</Button>
                <Button ariaPressed={activePirateGame === "coin"} className={activePirateGame === "coin" ? "selected" : ""} onClick={() => setActivePirateGame("coin")}>Coin flip</Button>
              </div>
              {activePirateGame === "dice" && <>
              {showPirateHelp && (
                <aside className="pirate-help-panel">
                  <h2>How to play</h2>
                  <p>
                    Choose Upper or Below and bet a multiple of 10. The host and
                    you roll one die each, then choose a second-round action. A
                    tie loses. Wagers are capped at 100 coins with up to 50
                    coins of credit.
                  </p>
                  <h3>Recent games</h3>
                  {pirateHistory.length ? (
                    <ol>
                      {pirateHistory.map((game, index) => (
                        <li
                          key={`${game.playerTotal}-${game.hostTotal}-${index}`}
                        >
                          {game.won ? "Won" : "Lost"} {game.wager} · You{" "}
                          {game.playerTotal}, host {game.hostTotal} ·{" "}
                          {game.prediction === "upper" ? "Upper" : "Below"}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>No games played yet.</p>
                  )}
                </aside>
              )}
              <div className="pirate-board">
                <div className="pirate-side pirate-host-side">
                  <h2>Host</h2>
                  <div className="pirate-dice-row">
                    {hostDice.map((die, index) => (
                      <div
                        key={`host-${index}`}
                        className={`fruit-die ${(pirateStage === "rolling-first" && index === 0) || (pirateStage === "rolling-second" && index === 1) ? "rolling" : ""}`}
                        aria-label={
                          die ? `Host die showing ${die}` : "Unknown host die"
                        }
                      >
                        {die === null ? "?" : fruitDice[die - 1]}
                      </div>
                    ))}
                  </div>
                  <span className="pirate-total">
                    Total:{" "}
                    {hostDice.every((die) => die !== null)
                      ? (hostDice[0] as number) + (hostDice[1] as number)
                      : "—"}
                  </span>
                </div>
                <div className="pirate-side pirate-player-side">
                  <h2>You</h2>
                  <div className="pirate-dice-row">
                    {playerDice.map((die, index) => (
                      <div
                        key={`player-${index}`}
                        className={`fruit-die ${(pirateStage === "rolling-first" && index === 0) || (pirateStage === "rolling-second" && index === 1) ? "rolling" : ""}`}
                        aria-label={
                          die ? `Your die showing ${die}` : "Unknown die"
                        }
                      >
                        {die === null ? "?" : fruitDice[die - 1]}
                      </div>
                    ))}
                  </div>
                  <span className="pirate-total">
                    Total:{" "}
                    {playerDice.every((die) => die !== null)
                      ? (playerDice[0] as number) + (playerDice[1] as number)
                      : "—"}
                  </span>
                </div>
              </div>
              {pirateGameOver ? (
                <div className="pirate-game-over">
                  <strong>Game Over</strong>
                  <span>
                    You don’t have enough coins or credit for the minimum
                    10-coin bet.
                  </span>
                  <Button
                    className="coin-flip-button"
                    onClick={() => void handlePirateRestart()}
                  >
                    Restart
                  </Button>
                </div>
              ) : pirateStage === "betting" ||
                pirateStage === "validating-first" ||
                pirateStage === "rolling-first" ? (
                <div className="pirate-controls pirate-start-controls">
                  <div
                    className="pirate-prediction-picker"
                    role="group"
                    aria-label="Choose your prediction"
                  >
                    {(["upper", "below"] as const).map((choice) => (
                      <Button
                        key={choice}
                        disabled={pirateBusy}
                        ariaPressed={piratePrediction === choice}
                        className={`pirate-choice-button ${piratePrediction === choice ? "selected" : ""}`}
                        onClick={() => setPiratePrediction(choice)}
                      >
                        {choice === "upper" ? "Upper ↑" : "Below ↓"}
                      </Button>
                    ))}
                  </div>
                  <div className="pirate-control-row">
                    <label className="bet-label" htmlFor="pirate-start-bet">
                      Bet coins
                    </label>
                    <input
                      className="bet-input"
                      id="pirate-start-bet"
                      type="number"
                      min={10}
                      max={pirateMaxWager}
                      step={10}
                      disabled={pirateBusy}
                      value={pirateBetDraft}
                      onChange={(event) =>
                        setPirateBetDraft(event.target.value)
                      }
                    />
                    <Button
                      className="coin-flip-button"
                      disabled={pirateBusy}
                      onClick={() => void startPirateGame()}
                    >
                      {pirateStage === "validating-first"
                        ? "Checking…"
                        : pirateStage === "rolling-first"
                          ? "Rolling…"
                          : "Bet & Roll"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pirate-controls pirate-round-two-controls">
                  <div
                    className="pirate-prediction-picker"
                    role="group"
                    aria-label="Update your prediction"
                  >
                    {(["upper", "below"] as const).map((choice) => (
                      <Button
                        key={choice}
                        disabled={pirateBusy}
                        ariaPressed={piratePrediction === choice}
                        className={`pirate-choice-button ${piratePrediction === choice ? "selected" : ""}`}
                        onClick={() => setPiratePrediction(choice)}
                      >
                        {choice === "upper" ? "Upper ↑" : "Below ↓"}
                      </Button>
                    ))}
                  </div>
                  <div className="pirate-control-row">
                    <label className="bet-label" htmlFor="pirate-add-bet">
                      Add coins
                    </label>
                    <input
                      className="bet-input"
                      id="pirate-add-bet"
                      type="number"
                      min={10}
                      max={Math.max(0, pirateMaxWager - pirateWager)}
                      step={10}
                      disabled={pirateBusy}
                      value={pirateAddDraft}
                      onChange={(event) =>
                        setPirateAddDraft(event.target.value)
                      }
                    />
                    <Button
                      className="coin-flip-button"
                      disabled={pirateBusy}
                      onClick={() => void rollPirateSecondDice("add")}
                    >
                      Add &amp; Roll
                    </Button>
                  </div>
                  <div className="pirate-action-buttons">
                    <Button
                      className="coin-flip-button secondary"
                      disabled={pirateBusy}
                      onClick={() => void rollPirateSecondDice("stand")}
                    >
                      Stand &amp; Roll
                    </Button>
                    <Button
                      className="coin-flip-button secondary"
                      disabled={pirateBusy}
                      onClick={() => void rollPirateSecondDice("double")}
                    >
                      Double &amp; Roll
                    </Button>
                  </div>
                </div>
              )}
              {pirateError && (
                <p className="pirate-error" role="alert">
                  {pirateError}
                </p>
              )}
              {piratePayout && (
                <p
                  className={`pirate-result-line ${piratePayout.won ? "won" : "lost"}`}
                >
                  {piratePayout.won ? "You won!" : "You lost."} The final dice
                  remain on the board.
                </p>
              )}
              </>}
              {activePirateGame === "coin" && <section className="pirate-coinflip-section" aria-labelledby="coinflip-title">
                <div className="coinflip-heading">
                  <span className="eyebrow">BONUS GAME</span>
                  <h2 id="coinflip-title">Coin flip</h2>
                  <p>Pick a side and wager coins from your shared balance.</p>
                </div>
                <div className={`coinflip-coin ${coinFlipBusy ? "flipping" : ""} ${coinFlipResult?.face ?? ""}`} aria-live="polite">
                  {coinFlipBusy ? "Flipping…" : coinFlipResult?.face ?? "Ready"}
                </div>
                <div className="coinflip-controls">
                  <div className="coinflip-sides" role="group" aria-label="Choose heads or tails">
                    {(["heads", "tails"] as const).map((side) => (
                      <Button key={side} disabled={coinFlipBusy || pirateStage !== "betting"} ariaPressed={coinFlipChoice === side} className={`pirate-choice-button ${coinFlipChoice === side ? "selected" : ""}`} onClick={() => setCoinFlipChoice(side)}>
                        {side === "heads" ? "Heads" : "Tails"}
                      </Button>
                    ))}
                  </div>
                  <label className="bet-label" htmlFor="coinflip-bet">Bet coins</label>
                  <input className="bet-input" id="coinflip-bet" type="number" min={1} max={Math.max(0, coins)} step={1} disabled={coinFlipBusy || pirateStage !== "betting"} value={coinFlipBet} onChange={(event) => setCoinFlipBet(event.target.value)} />
                  <Button className="coin-flip-button" disabled={coinFlipBusy || pirateStage !== "betting" || coins < 1} onClick={() => void playCoinFlip()}>{coinFlipBusy ? "Flipping…" : "Flip coin"}</Button>
                </div>
                {coinFlipError && <p className="pirate-error" role="alert">{coinFlipError}</p>}
                {coinFlipResult && <p className={`pirate-result-line ${coinFlipResult.won ? "won" : "lost"}`}>{coinFlipResult.won ? `You won ${coinFlipResult.bet} coins!` : `You lost ${coinFlipResult.bet} coins.`}</p>}
              </section>}
            </section>
          ) : (
            <>
              <section className="welcome">
                <div>
                  <span className="eyebrow">MONDAY, MAY 26</span>
                  <h1>Ready for a little progress?</h1>
                  <p>
                    Small actions add up. Pick a quest and make today count.
                  </p>
                </div>
                {!hasGeneratedTask && (
                  <Button
                    className="primary-button"
                    onClick={() => setGeneratePromptOpen(true)}
                  >
                    <Icon name="spark" size={18} />
                    <span>Generate tasks</span>
                  </Button>
                )}
              </section>

              <section className="avatar-studio">
                <div className="avatar-intro">
                  <span className="feature-label">
                    <Icon name="spark" size={14} /> YOUR CHARACTER
                  </span>
                  <h2>Meet your progress pal.</h2>
                  <p>Build better days together, one small quest at a time.</p>
                  <div className="character-status">
                    <span className="status-dot" />
                    <span>Wearing</span>
                    <strong>{equipped}</strong>
                  </div>
                </div>

                <div className="character-stage">
                  <div className="character-halo" />
                  <Character
                    catalog={storeItems}
                    gender={gender}
                    outfit={equipped}
                  />
                </div>

                <div className="avatar-controls">
                  {/*<div className="control-group">
                    <span className="control-label">CHARACTER</span>
                    <div className="gender-toggle" role="group" aria-label="Choose character gender">
                      <Button
                        className={gender === "woman" ? "selected" : ""}
                        ariaPressed={gender === "woman"}
                        onClick={() => setGender("woman")}
                      >
                        Female
                      </Button>
                      <Button
                        className={gender === "man" ? "selected" : ""}
                        ariaPressed={gender === "man"}
                        onClick={() => setGender("man")}
                      >
                        Male
                      </Button>
                    </div>
                  </div>*/}
                  <div className="control-group">
                    <span className="control-label">WARDROBE</span>
                    <div className="wardrobe-list">
                      {["Everyday tee", ...purchased].map((outfit) => (
                        <Button
                          className={`wardrobe-item ${
                            equipped === outfit ? "equipped" : ""
                          }`}
                          key={outfit}
                          onClick={() => setEquipped(outfit)}
                        >
                          <span
                            className="outfit-swatch"
                            style={{
                              background: resolveOutfit(outfit, storeItems)
                                .style.primary,
                            }}
                          />
                          <span>{outfit}</span>
                          {equipped === outfit && (
                            <Icon name="check" size={14} />
                          )}
                        </Button>
                      ))}
                    </div>
                    {purchased.length === 0 && (
                      <Button
                        className="store-link"
                        onClick={() => setActiveNav("Store")}
                      >
                        Find new clothes <Icon name="chevron" size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="left-column">
                  {/*<article className="feature-card">
                    <div className="feature-copy">
                      <span className="feature-label">
                        <Icon name="spark" size={14} /> BONUS QUEST
                      </span>
                      <h2>{content.bonusQuest.title}</h2>
                      <p>{content.bonusQuest.detail}</p>
                      <div className="feature-meta">
                        <span>
                          <Icon name="clock" size={16} />{" "}
                          {content.bonusQuest.duration}
                        </span>
                        <span className="coin-reward">
                          <Icon name="coin" size={14} /> +
                          {content.bonusQuest.coins}
                        </span>
                      </div>
                      <Button
                        className={`feature-button ${
                          claimed ? "complete" : ""
                        }`}
                        onClick={() => {
                          setClaimed(true);
                          if (!claimed) {
                            setCoins(
                              (current) => current + content.bonusQuest.coins,
                            );
                          }
                          setToast(
                            claimed
                              ? "Reward already claimed"
                              : "Bonus quest completed!",
                          );
                          window.setTimeout(() => setToast(""), 2400);
                        }}
                      >
                        <Icon name={claimed ? "check" : "bolt"} size={17} />
                        {claimed ? "Quest complete" : "Start bonus quest"}
                      </Button>
                    </div>
                    <div className="feature-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="gift-box">
                        <span className="gift-lid" />
                        <span className="gift-body" />
                        <span className="gift-ribbon" />
                      </div>
                      <span className="art-star star-one" />
                      <span className="art-star star-two" />
                      <span className="art-dot dot-one" />
                      <span className="art-dot dot-two" />
                    </div>
                  </article>*/}

                  <section className="quest-section">
                    <div className="section-heading">
                      <div>
                        <h2>Today&apos;s quests</h2>
                        <p>
                          {completed} of {quests.length} completed
                        </p>
                      </div>
                      <div className="daily-progress">
                        <div className="progress-track">
                          <div
                            style={{
                              width: `${completionPercent}%`,
                            }}
                          />
                        </div>
                        <span>{completionPercent}%</span>
                      </div>
                    </div>

                    <div className="quest-list">
                      {quests.length === 0 && (
                        <div className="empty-quests">
                          <strong>No quests yet</strong>
                          <span>Add a quest to get started.</span>
                        </div>
                      )}
                      {quests.map((quest) => (
                        <article
                          className={`quest-card ${quest.done ? "done" : ""}`}
                          key={quest.id}
                        >
                          <div className={`quest-icon ${quest.tone}`}>
                            <Icon name={quest.icon} />
                          </div>
                          <div className="quest-copy">
                            <div className="quest-title-line">
                              <h3>{quest.title}</h3>
                              <span className="category">{quest.category}</span>
                              {typeof quest.coinReward === "number" && (
                                <span className="coin-reward-badge">
                                  <Icon name="coin" size={12} />+
                                  {quest.coinReward} coins
                                </span>
                              )}
                            </div>
                            <p>{quest.detail}</p>
                          </div>
                          <Button
                            ariaLabel={
                              quest.done
                                ? `Mark ${quest.title} incomplete`
                                : `Complete ${quest.title}`
                            }
                            className={`check-button ${
                              quest.done ? "checked" : ""
                            }`}
                            onClick={() => toggleQuest(quest.id)}
                          >
                            {quest.done && <Icon name="check" size={17} />}
                          </Button>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="right-column">
                  <section className="quote-card">
                    <Icon name="leaf" size={22} />
                    <blockquote>“{content.dashboard.quote}”</blockquote>
                    <span>{content.dashboard.quoteAuthor}</span>
                  </section>
                </aside>
              </section>
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className="toast">
          <Icon name="spark" size={17} />
          {toast}
        </div>
      )}
      {generatePromptOpen && (
        <div className="onboarding-backdrop" role="presentation">
          <form
            aria-labelledby="generate-task-title"
            aria-modal="true"
            className="onboarding-modal generate-task-modal"
            onSubmit={(event) => {
              event.preventDefault();
              void generateTask();
            }}
            role="dialog"
          >
            <span className="eyebrow">SIDE QUEST</span>
            <h2 id="generate-task-title">What side quest would you like?</h2>
            <p>Describe a task and we’ll generate it for you.</p>
            <label htmlFor="side-quest-input">Your side quest</label>
            <textarea
              autoFocus
              id="side-quest-input"
              maxLength={500}
              onChange={(event) => setSideQuestDraft(event.target.value)}
              placeholder="For example: Take a 20-minute walk outside"
              rows={4}
              value={sideQuestDraft}
            />
            <div className="generate-task-actions">
              <Button
                className="generate-cancel-button"
                disabled={generatingTask}
                onClick={() => setGeneratePromptOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="onboarding-button"
                disabled={!sideQuestDraft.trim() || generatingTask}
                onClick={() => void generateTask()}
              >
                {generatingTask ? "Generating…" : "Generate tasks"}
              </Button>
            </div>
          </form>
        </div>
      )}
      {profileReady && !playerName && (
        <div className="onboarding-backdrop" role="presentation">
          <section
            aria-labelledby="onboarding-title"
            aria-modal="true"
            className="onboarding-modal"
            role="dialog"
          >
            <div className="onboarding-mark">
              <Icon name="bolt" size={28} />
            </div>
            <span className="eyebrow">WELCOME TO LevelUP</span>
            <h2 id="onboarding-title">What should we call you?</h2>
            <p>Add your first name to begin your quest.</p>
            <label htmlFor="player-name">Your name</label>
            <input
              autoFocus
              id="player-name"
              maxLength={40}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && nameDraft.trim()) {
                  void startJourney();
                }
              }}
              placeholder="Enter your first name"
              type="text"
              value={nameDraft}
            />
            <div className="onboarding-gender">
              <span className="gender-label">Choose your gender</span>
              <div
                className="gender-toggle"
                role="group"
                aria-label="Choose your gender"
              >
                <Button
                  ariaPressed={gender === "man"}
                  className={gender === "man" ? "selected" : ""}
                  onClick={() => setGender("man")}
                >
                  Male
                </Button>
                <Button
                  ariaPressed={gender === "woman"}
                  className={gender === "woman" ? "selected" : ""}
                  onClick={() => setGender("woman")}
                >
                  Female
                </Button>
              </div>
            </div>
            <Button
              className="onboarding-button"
              disabled={!nameDraft.trim()}
              onClick={() => void startJourney()}
            >
              Start my journey <Icon name="chevron" size={17} />
            </Button>
            <span className="privacy-note">
              Use a first name only. Avoid entering sensitive information.
            </span>
          </section>
        </div>
      )}
    </div>
  );
}
