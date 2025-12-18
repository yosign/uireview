/**
 * 使用 IndexedDB 存储大图片的工具类
 * IndexedDB 可以存储几百MB的数据，远超 sessionStorage 的 5-10MB 限制
 */

const DB_NAME = 'AvatarGeneratorDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

// 打开/创建数据库
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB 只能在浏览器环境中使用'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建对象存储（如果不存在）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// 保存数据到 IndexedDB
export const saveToIndexedDB = async (key: string, value: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put(value, key);
      request.onsuccess = () => {
        console.log(`已保存到 IndexedDB: ${key}, 大小: ${(value.length / 1024 / 1024).toFixed(2)}MB`);
        resolve();
      };
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('保存到 IndexedDB 失败:', error);
    throw error;
  }
};

// 从 IndexedDB 读取数据
export const getFromIndexedDB = async (key: string): Promise<string | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const value = request.result as string | undefined;
        if (value) {
          console.log(`从 IndexedDB 读取: ${key}, 大小: ${(value.length / 1024 / 1024).toFixed(2)}MB`);
        } else {
          console.log(`IndexedDB 中未找到: ${key}`);
        }
        resolve(value || null);
      };
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('从 IndexedDB 读取失败:', error);
    return null;
  }
};

// 从 IndexedDB 删除数据
export const removeFromIndexedDB = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => {
        console.log(`已从 IndexedDB 删除: ${key}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('从 IndexedDB 删除失败:', error);
    throw error;
  }
};

// 清空所有数据
export const clearIndexedDB = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('已清空 IndexedDB');
        resolve();
      };
      request.onerror = () => reject(request.error);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('清空 IndexedDB 失败:', error);
    throw error;
  }
};

