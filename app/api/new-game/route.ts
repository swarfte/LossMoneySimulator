import { NextResponse } from "next/server";
import { getRandomStockData } from "@/app/action";

// GET请求：获取新的随机股票数据
export async function GET() {
  try {
    const data = await getRandomStockData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "获取股票数据失败" }, { status: 500 });
  }
}
