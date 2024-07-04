// utils/debound.js
function debounce(func, wait) {
  let timeout;
  return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
          func.apply(this, args);
      }, wait);
  };
}

export { debounce }; // 确保使用 export 导出函数
