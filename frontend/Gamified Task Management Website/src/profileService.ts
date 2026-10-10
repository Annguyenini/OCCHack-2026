export type PlayerProfile = {
  name: string
  level: number
  xp: number
  coins?: number
  purchased?: string[]
  equipped?: string
  gender?: "woman" | "man"
  completedQuestIds?: number[]
  bonusClaimed?: boolean
}

const storageKey = "sidekick-player-profile"
const profileApiUrl = import.meta.env.VITE_PROFILE_API_URL

export async function loadPlayerProfile(): Promise<PlayerProfile | null> {
  if (profileApiUrl) {
    try {
      const response = await fetch(profileApiUrl)
      if (response.ok) return (await response.json()) as PlayerProfile
    } catch {
      // Fall through to the local cache when the configured backend is unavailable.
    }
  }

  const cached = window.localStorage.getItem(storageKey)
  return cached ? JSON.parse(cached) as PlayerProfile : null
}

export async function savePlayerProfile(profile: PlayerProfile) {
  window.localStorage.setItem(storageKey, JSON.stringify(profile))

  if (!profileApiUrl) return

  const response = await fetch(profileApiUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  })

  if (!response.ok) throw new Error("Unable to save player profile")
}
