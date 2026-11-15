/** Static .json.gz files may arrive compressed, or already decoded by a CDN. */
export async function decodeStaticJson<T>(bytes:Uint8Array):Promise<T>{
 const gzip=bytes[0]===0x1f&&bytes[1]===0x8b;
 if(!gzip)return JSON.parse(new TextDecoder().decode(bytes)) as T;
 if(typeof DecompressionStream==='undefined')throw new Error('이 브라우저는 압축 자료를 열 수 없습니다. 최신 크롬에서 다시 조회해 주세요.');
 const stream=new Blob([bytes.slice().buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
 return await new Response(stream).json() as T;
}
