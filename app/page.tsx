import { getRandomStockData } from "@/app/action";
import GameClient from "@/app/GameClient";

export default async function Home() {
  // 在服务端直接获取初始数据
  const initialGameData = await getRandomStockData();

  return <GameClient initialData={initialGameData} />;
}
