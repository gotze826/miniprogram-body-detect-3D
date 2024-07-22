// utils/pose-estimation.js
class PoseEstimation {
  constructor() {
    this.previousKeypoints = [];
    this.previousPositions = [];
    this.threshold = 0.01; // 降低运动阈值
    this.timeWindow = 10; // 缩短时间窗口
    this.counter = 0;
    this.state = 'idle'; // 当前状态
    this.movementDetected = false;
    this.movementDirection = null;
  }

  updateData(keypoints, position) {
    this.previousKeypoints.push(keypoints);
    this.previousPositions.push(position);
    if (this.previousKeypoints.length > 10) { // 只保留最近10帧
      this.previousKeypoints.shift();
      this.previousPositions.shift();
    }
  }

  detectMovement() {
    if (this.previousKeypoints.length < 2) return null;

    const keypoints1 = this.previousKeypoints[0];
    const keypoints2 = this.previousKeypoints[this.previousKeypoints.length - 1];
    const position1 = this.previousPositions[0];
    const position2 = this.previousPositions[this.previousPositions.length - 1];

    // 选择膝盖、臀部和肩膀关键点的索引
    const relevantIndices = [14, 13, 11, 12, 5, 6]; // 这些是膝盖、臀部和肩膀的索引

    const movements = relevantIndices.map(index => {
      const kp1 = keypoints1[index];
      const kp2 = keypoints2[index];
      return {
        dx: kp2.x - kp1.x,
        dy: kp2.y - kp1.y
      };
    });

    const avgDx = movements.reduce((sum, kp) => sum + kp.dx, 0) / movements.length;
    const avgDy = movements.reduce((sum, kp) => sum + kp.dy, 0) / movements.length;
    const avgPx = position2.x - position1.x;
    const avgPy = position2.y - position1.y;

    switch (this.state) {
      case 'idle':
        if (Math.abs(avgDx) > this.threshold || Math.abs(avgDy) > this.threshold) {
          this.state = 'start_moving';
          this.counter = this.timeWindow;
          this.movementDetected = false;
        }
        break;

      case 'start_moving':
        if (this.counter <= 0) {
          this.state = 'moving';
        } else {
          this.counter -= 1;
        }
        break;

      case 'moving':
        if (Math.abs(avgDx) > Math.abs(avgDy)) {
          if (avgDx > this.threshold) {
            this.movementDirection = 'right';
          } else if (avgDx < -this.threshold) {
            this.movementDirection = 'left';
          }
        } else {
          if (avgDy > this.threshold) {
            this.movementDirection = 'down';
          } else if (avgDy < -this.threshold) {
            this.movementDirection = 'up';
          }
        }

        if (Math.abs(avgPx) < this.threshold && Math.abs(avgPy) < this.threshold) {
          this.state = 'action_done';
        }
        break;

      case 'action_done':
        this.state = 'idle';
        const result = this.movementDirection;
        this.movementDirection = null;
        return result;
    }

    return null;
  }
}

export default PoseEstimation;
