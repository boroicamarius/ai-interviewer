"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { FALLBACK_META } from "@/lib/constants";

export function useMeta() {
  const [meta, setMeta] = useState(FALLBACK_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    api
      .getMeta()
      .then((data) => {
        if (!active) return;
        setMeta({
          ...FALLBACK_META,
          ...data,
          limits: { ...FALLBACK_META.limits, ...data.limits },
          provider: { ...FALLBACK_META.provider, ...data.provider },
        });
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { meta, loading, error };
}
