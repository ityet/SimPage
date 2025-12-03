import { onRequest } from './node-functions/api/[[default]].js';

// EdgeOne 主入口函数
export async function handler(request, env, context) {
  try {
    return await onRequest({ request, env, ...context });
  } catch (error) {
    console.error('EdgeOne function error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 兼容不同的 EdgeOne 版本
export { handler as onRequest };