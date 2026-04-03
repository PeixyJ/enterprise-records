import { useLocation } from "react-router"

const titleMap: Record<string, { title: string; parent?: string }> = {
  "/app": { title: "工作台" },
  "/app/screening": { title: "初筛表", parent: "档案管理" },
  "/app/city": { title: "市级表", parent: "档案管理" },
  "/app/town": { title: "镇级表", parent: "档案管理" },
  "/app/other": { title: "其他表", parent: "档案管理" },
  "/app/advanced-settings": { title: "高级设置", parent: "系统设置" },
  "/app/settings": { title: "基本设置", parent: "系统设置" },
}

export function usePageTitle() {
  const { pathname } = useLocation()
  return titleMap[pathname] ?? { title: "工作台" }
}
