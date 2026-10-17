import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GRADES } from "@/lib/constants";

let cache = null;

export function useMeta() {
  const [meta, setMeta] = useState(cache || { grades: GRADES, subjects: [], plan_subjects: [] });
  useEffect(() => {
    api.get("/meta").then((r) => {
      cache = r.data;
      setMeta(r.data);
    }).catch(() => {});
  }, []);
  return meta;
}
