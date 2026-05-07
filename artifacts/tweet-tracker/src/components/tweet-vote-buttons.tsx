import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

function getFingerprint(): string {
  let fp = localStorage.getItem("tn_fp");
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("tn_fp", fp);
  }
  return fp;
}

interface VoteState {
  likes: number;
  dislikes: number;
  userVote: "like" | "dislike" | null;
}

interface TweetVoteButtonsProps {
  tweetId: number;
  compact?: boolean;
}

export function TweetVoteButtons({ tweetId, compact = false }: TweetVoteButtonsProps) {
  const [state, setState] = useState<VoteState>({ likes: 0, dislikes: 0, userVote: null });
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const fingerprint = getFingerprint();

  const fetchVotes = useCallback(async () => {
    try {
      const r = await fetch(`/api/votes?tweetIds=${tweetId}&fingerprint=${encodeURIComponent(fingerprint)}`);
      const data = await r.json();
      const d = data[tweetId];
      if (d) setState(d);
    } finally {
      setLoading(false);
    }
  }, [tweetId, fingerprint]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  const handleVote = async (voteType: "like" | "dislike") => {
    if (voting) return;
    setVoting(true);
    const prev = { ...state };

    // Optimistic update
    setState((s) => {
      if (s.userVote === voteType) {
        return {
          ...s,
          likes: voteType === "like" ? s.likes - 1 : s.likes,
          dislikes: voteType === "dislike" ? s.dislikes - 1 : s.dislikes,
          userVote: null,
        };
      } else {
        return {
          likes:
            voteType === "like"
              ? s.likes + 1
              : s.userVote === "like"
              ? s.likes - 1
              : s.likes,
          dislikes:
            voteType === "dislike"
              ? s.dislikes + 1
              : s.userVote === "dislike"
              ? s.dislikes - 1
              : s.dislikes,
          userVote: voteType,
        };
      }
    });

    try {
      const r = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetId, voteType, fingerprint }),
      });
      if (!r.ok) setState(prev);
    } catch {
      setState(prev);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-6 w-12 rounded bg-muted" />
        <div className="h-6 w-12 rounded bg-muted" />
      </div>
    );
  }

  const btnBase = compact
    ? "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all"
    : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote("like"); }}
        disabled={voting}
        className={`${btnBase} ${
          state.userVote === "like"
            ? "bg-emerald-500 text-white shadow-sm"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
        }`}
        title="Like this tweet"
      >
        <ThumbsUp className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>{state.likes}</span>
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVote("dislike"); }}
        disabled={voting}
        className={`${btnBase} ${
          state.userVote === "dislike"
            ? "bg-red-500 text-white shadow-sm"
            : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20"
        }`}
        title="Dislike this tweet"
      >
        <ThumbsDown className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>{state.dislikes}</span>
      </button>
    </div>
  );
}
