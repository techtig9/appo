export function getRequestId(req: Request): string { const id=req.headers.get("x-request-id")?.trim(); return id && /^[A-Za-z0-9._:-]{8,100}$/.test(id) ? id : crypto.randomUUID(); }
export function withRequestId(headers: HeadersInit|undefined,id:string): Headers { const h=new Headers(headers); h.set("x-request-id",id); return h; }
