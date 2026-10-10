import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  type PlayerProfile,
} from "./profileService";

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
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={ariaLabel}
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

export default function App() {
  const [content, setContent] = useState<AppContent>(defaultAppContent);
  const [quests, setQuests] = useState<Quest[]>(defaultAppContent.quests);
  const [activeNav, setActiveNav] = useState("Today");
  const [claimed, setClaimed] = useState(false);
  const [toast, setToast] = useState("");
  const [coins, setCoins] = useState(defaultAppContent.economy.startingCoins);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [gender, setGender] = useState<"woman" | "man">("woman");
  const [equipped, setEquipped] = useState("Everyday tee");
  const [playerName, setPlayerName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  const completed = quests.filter((quest) => quest.done).length;
  const earnedXp = useMemo(
    () =>
      quests
        .filter((quest) => quest.done)
        .reduce((total, quest) => total + quest.xp, 0),
    [quests],
  );
  const totalXp = earnedXp + (claimed ? content.bonusQuest.xp : 0);
  const levelProgress = useMemo(() => {
    let level = 0;
    let xpIntoLevel = totalXp;
    let xpNeeded = content.leveling.baseXp;

    while (xpIntoLevel >= xpNeeded) {
      xpIntoLevel -= xpNeeded;
      level += 1;
      xpNeeded *= content.leveling.multiplier;
    }

    return {
      level,
      xpIntoLevel,
      xpNeeded,
      percent: (xpIntoLevel / xpNeeded) * 100,
    };
  }, [content.leveling.baseXp, content.leveling.multiplier, totalXp]);

  useEffect(() => {
    Promise.all([
      loadAppContent().catch(() => defaultAppContent),
      loadPlayerProfile().catch(() => null),
    ])
      .then(([nextContent, profile]) => {
        setContent(nextContent);
        setQuests(
          nextContent.quests.map((quest) => ({
            ...quest,
            done: profile?.completedQuestIds
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
          setGender(profile.gender ?? "woman");
          setClaimed(profile.bonusClaimed ?? false);
        }
      })
      .finally(() => setProfileReady(true));
  }, []);

  useEffect(() => {
    if (!playerName || !profileReady) return;

    const profile: PlayerProfile = {
      name: playerName,
      level: levelProgress.level,
      xp: totalXp,
      coins,
      purchased,
      equipped,
      gender,
      completedQuestIds: quests
        .filter((quest) => quest.done)
        .map((quest) => quest.id),
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
    levelProgress.level,
    playerName,
    profileReady,
    purchased,
    quests,
    totalXp,
  ]);

  const toggleQuest = (id: number) => {
    const quest = quests.find((item) => item.id === id);
    setQuests((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
    if (quest && !quest.done) {
      setCoins((current) => current + content.economy.coinsPerQuest);
      setToast(`Nice work — +${quest.xp} XP`);
      window.setTimeout(() => setToast(""), 2400);
    } else if (quest?.done) {
      setCoins((current) =>
        Math.max(0, current - content.economy.coinsPerQuest),
      );
    }
  };

  const addQuest = () => {
    const id = Date.now();
    setQuests((current) => [
      ...current,
      {
        id,
        ...content.newQuestTemplate,
        done: false,
      },
    ]);
    setToast("A fresh quest joined your day");
    window.setTimeout(() => setToast(""), 2400);
  };

  const storeItems = content.storeItems;

  const buyItem = (name: string, price: number) => {
    if (purchased.includes(name)) return;
    if (coins < price) {
      setToast("Not enough coins yet — complete more quests");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    setCoins((current) => current - price);
    setPurchased((current) => [...current, name]);
    setEquipped(name);
    setToast(`${name} added to your collection`);
    window.setTimeout(() => setToast(""), 2400);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon name="bolt" size={19} />
          </div>
          <span>Sidekick</span>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {[
            ["Today", "home"],
            ["My quests", "target"],
            ["Store", "bag"],
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
          <div className="mini-level">
            <div className="avatar">
              {playerName ? playerName.slice(0, 2).toUpperCase() : "SK"}
            </div>
            <div>
              <strong>{playerName || "New explorer"}</strong>
              <span>Level {levelProgress.level} explorer</span>
            </div>
            <Icon name="chevron" size={17} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <Button className="mobile-logo" ariaLabel="Open navigation">
            <Icon name="bolt" />
          </Button>
          <div className="streak-pill">
            <Icon name="spark" size={17} />
            <span>
              <strong>{content.dashboard.streakDays}</strong> day streak
            </span>
          </div>
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
          <div className="level-progress">
            <span>LVL {levelProgress.level}</span>
            <div className="progress-track">
              <div style={{ width: `${levelProgress.percent}%` }} />
            </div>
            <strong>
              {levelProgress.xpIntoLevel}/{levelProgress.xpNeeded} XP
            </strong>
          </div>
        </header>

        <div className="content">
          {activeNav === "Store" ? (
            <section className="store-view">
              <div className="store-hero">
                <div>
                  <span className="eyebrow">SIDEKICK STORE</span>
                  <h1>Dress your sidekick.</h1>
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
                                    onClick={() =>
                                      buyItem(item.name, item.price)
                                    }
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
                <Button className="primary-button" onClick={addQuest}>
                  <Icon name="plus" size={18} />
                  <span>Add a quest</span>
                </Button>
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
                <article>
                  <span className="summary-icon earned">
                    <Icon name="bolt" size={19} />
                  </span>
                  <div>
                    <strong>{earnedXp}</strong>
                    <span>XP earned</span>
                  </div>
                </article>
              </div>

              <section className="bonus-quest-panel">
                <div className="bonus-symbol">
                  <Icon name="spark" size={30} />
                </div>
                <div className="bonus-quest-copy">
                  <span>BONUS QUEST</span>
                  <h2>{content.bonusQuest.title}</h2>
                  <p>{content.bonusQuest.detail}</p>
                </div>
                <div className="bonus-rewards">
                  <span>+{content.bonusQuest.xp} XP</span>
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
                      `Bonus complete — +${content.bonusQuest.xp} XP and +${content.bonusQuest.coins} coins`,
                    );
                    window.setTimeout(() => setToast(""), 2400);
                  }}
                >
                  <Icon name={claimed ? "check" : "bolt"} size={16} />
                  {claimed ? "Completed" : "Complete quest"}
                </Button>
              </section>

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
                              <span className="quest-xp">+{quest.xp} XP</span>
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
                              <span className="quest-xp">+{quest.xp} XP</span>
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
                <Button className="primary-button" onClick={addQuest}>
                  <Icon name="plus" size={18} />
                  <span>Add a quest</span>
                </Button>
              </section>

              <section className="avatar-studio">
                <div className="avatar-intro">
                  <span className="feature-label">
                    <Icon name="spark" size={14} /> YOUR SIDEKICK
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
                  <div className="control-group">
                    <span className="control-label">CHARACTER</span>
                    <div className="gender-toggle">
                      <Button
                        className={gender === "woman" ? "selected" : ""}
                        onClick={() => setGender("woman")}
                      >
                        Woman
                      </Button>
                      <Button
                        className={gender === "man" ? "selected" : ""}
                        onClick={() => setGender("man")}
                      >
                        Man
                      </Button>
                    </div>
                  </div>
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
                  <article className="feature-card">
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
                        <span className="xp-badge">
                          +{content.bonusQuest.xp} XP
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
                              : `Bonus complete — +${content.bonusQuest.xp} XP`,
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
                  </article>

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
                              width: `${(completed / quests.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span>
                          {Math.round((completed / quests.length) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="quest-list">
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
                            </div>
                            <p>{quest.detail}</p>
                          </div>
                          <span className="quest-xp">+{quest.xp} XP</span>
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
                  <section className="stat-card consistency-card">
                    <div className="card-title">
                      <div>
                        <span className="small-icon">
                          <Icon name="bolt" size={17} />
                        </span>
                        <h2>Your rhythm</h2>
                      </div>
                      <Button className="text-button">
                        This week <Icon name="chevron" size={14} />
                      </Button>
                    </div>
                    <div className="week-chart">
                      {content.dashboard.weeklyRhythm.map(
                        ({ day, value }, index) => (
                          <div className="day" key={`${day}-${index}`}>
                            <div className="bar-track">
                              <div
                                className={index === 4 ? "today-bar" : ""}
                                style={{ height: `${value}%` }}
                              />
                            </div>
                            <span>{day}</span>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="rhythm-note">
                      <Icon name="spark" size={16} />
                      <span>
                        You&apos;re <strong>18% more consistent</strong> than
                        last week.
                      </span>
                    </div>
                  </section>

                  <section className="stat-card league-card">
                    <div className="card-title">
                      <div>
                        <span className="small-icon purple">
                          <Icon name="trophy" size={17} />
                        </span>
                        <h2>{content.dashboard.leagueName}</h2>
                      </div>
                    </div>
                    <div className="league-row">
                      <div className="league-badge">
                        <Icon name="trophy" size={29} />
                      </div>
                      <div>
                        <span>Your position</span>
                        <strong>
                          #{content.dashboard.leaguePosition}{" "}
                          <small>of {content.dashboard.leagueSize}</small>
                        </strong>
                      </div>
                      <div className="up-badge">↑ 3</div>
                    </div>
                    <div className="league-footer">
                      <div className="face-stack">
                        <span>JM</span>
                        <span>KL</span>
                        <span>RS</span>
                      </div>
                      <p>Top 10 move up on Sunday</p>
                    </div>
                  </section>

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
            <span className="eyebrow">WELCOME TO SIDEKICK</span>
            <h2 id="onboarding-title">What should we call you?</h2>
            <p>Add your first name to start at level 0 and begin your quest.</p>
            <label htmlFor="player-name">Your name</label>
            <input
              autoFocus
              id="player-name"
              maxLength={40}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && nameDraft.trim()) {
                  setPlayerName(nameDraft.trim());
                }
              }}
              placeholder="Enter your first name"
              type="text"
              value={nameDraft}
            />
            <Button
              className="onboarding-button"
              disabled={!nameDraft.trim()}
              onClick={() => setPlayerName(nameDraft.trim())}
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
