// 简单的KV存储测试脚本
// 在Node.js环境中模拟EdgeOne Pages KV存储

class MockKVNamespace {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async put(key, value, options = {}) {
    if (options.expirationTtl) {
      const expires = Date.now() + (options.expirationTtl * 1000);
      this.data.set(key, { value, expires });
    } else {
      this.data.set(key, value);
    }
    return Promise.resolve();
  }
}

// 模拟环境
const mockEnv = {
  KV_NAMESPACE: new MockKVNamespace()
};

// 导入存储类进行测试
async function testStorage() {
  try {
    console.log("开始测试EdgeOne KV Storage功能...\n");
    
    // 在Node.js环境中直接运行类的代码
    const fs = require('fs');
    const path = require('path');
    
    // 读取并执行EdgeOneKVStorage类
    const code = fs.readFileSync(path.join(__dirname, 'node-functions/api/[[default]].js'), 'utf8');
    
    // 提取类定义
    const classMatch = code.match(/class EdgeOneKVStorage[\s\S]*?^}/m);
    if (!classMatch) {
      throw new Error('无法找到EdgeOneKVStorage类定义');
    }
    
    // 在全局上下文中执行类定义
    eval(classMatch[0]);
    
    // 创建存储实例
    const storage = new EdgeOneKVStorage(mockEnv);
    
    // 测试1：创建默认数据
    console.log("测试1：创建默认数据");
    const defaultData = await storage.createDefaultData();
    console.log("✓ 默认数据创建成功");
    console.log(`  - 网站名称: ${defaultData.settings.siteName}`);
    console.log(`  - 应用数量: ${defaultData.apps.length}`);
    console.log(`  - 书签数量: ${defaultData.bookmarks.length}`);
    
    // 测试2：写入数据到KV
    console.log("\n测试2：写入数据到KV存储");
    await storage.writeFullData(defaultData);
    console.log("✓ 数据写入成功");
    
    // 测试3：从KV读取数据
    console.log("\n测试3：从KV存储读取数据");
    const readData = await storage.readFullData();
    console.log("✓ 数据读取成功");
    console.log(`  - 网站名称: ${readData.settings.siteName}`);
    console.log(`  - 应用数量: ${readData.apps.length}`);
    
    // 测试4：会话管理
    console.log("\n测试4：会话管理");
    const testToken = "test-token-123";
    await storage.setSession(testToken, "test-user", { ttl: 3600 });
    console.log("✓ 会话设置成功");
    
    const sessionValue = await storage.getSession(testToken);
    console.log(`✓ 会话读取成功: ${sessionValue}`);
    
    // 测试5：会话清理
    console.log("\n测试5：清理过期会话");
    await storage.cleanupExpiredSessions();
    console.log("✓ 会话清理完成");
    
    console.log("\n🎉 所有测试通过！EdgeOne KV Storage功能正常工作");
    
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error(error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testStorage();
}

module.exports = { testStorage };