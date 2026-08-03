import { POST as mainPOST, GET as mainGET } from '@/app/api/voice/route';

export async function POST(req: Request) {
  return mainPOST(req);
}

export async function GET(req: Request) {
  return mainGET(req);
}
