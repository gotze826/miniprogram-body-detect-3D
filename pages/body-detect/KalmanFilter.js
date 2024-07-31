class KalmanFilter {
  constructor() {
    this.R = 0.01; // 测量噪声协方差，较小的值可以增强响应速度
    this.Q = 1; // 过程噪声协方差，较大的值可以增强平滑效果
    this.A = 1; // 状态转移矩阵
    this.B = 0; // 控制矩阵
    this.C = 1; // 观测矩阵
    this.cov = NaN;
    this.x = NaN; // 估计值
  }

  filter(z) {
    if (isNaN(this.x)) {
      this.x = 1 / this.C * z;
      this.cov = 1 / this.C * this.R / this.C;
    } else {
      const predX = this.predict();
      const predCov = this.uncertainty();

      const K = predCov * this.C * (1 / (this.C * predCov * this.C + this.R));
      this.x = predX + K * (z - this.C * predX);
      this.cov = predCov - K * this.C * predCov;
    }
    return this.x;
  }

  predict() {
    return this.A * this.x + this.B * 0;
  }

  uncertainty() {
    return this.A * this.cov * this.A + this.Q;
  }
}

export default KalmanFilter;
