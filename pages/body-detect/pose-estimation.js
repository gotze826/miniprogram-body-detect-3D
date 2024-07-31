import KalmanFilter from './KalmanFilter';
class PoseEstimation {
  constructor() {
    this.previousKeypoints = [];
    this.positionThreshold = 0.1; // 坐标变化的阈值
    this.jumpThreshold = 0.1; // 跳跃的阈值
    this.timeWindow = 30; // 时间窗口
    this.kalmanFilters = {
      0: new KalmanFilter(), // 鼻子
      11: new KalmanFilter(), // 左髋部
      12: new KalmanFilter(), // 右髋部
      13: new KalmanFilter(), // 左膝盖
      14: new KalmanFilter(), // 右膝盖
    };
    this.verticalMovementState = 'idle';
    this.initialAvgY = null;
    this.timeSinceLastChange = 0;
    this.initialAvgYSet = false; // 新增的标志位，标记initialAvgY是否已经设置
  }

  updateData(keypoints, sections) {
    this.previousKeypoints.push(keypoints);
    if (this.previousKeypoints.length > this.timeWindow) { // 只保留最近的帧
      this.previousKeypoints.shift();
    }
    const avgX = this.getAverageX(keypoints);

    this.previousSection = this.currentSection;

    if (avgX < sections.section1End) {
      this.currentSection = 'Section 1';
    } else if (avgX < sections.section2End) {
      this.currentSection = 'Section 2';
    } else {
      this.currentSection = 'Section 3';
    }

    // 仅在垂直运动为idle时判断左右移动
    if (this.verticalMovementState === 'idle' && this.previousSection !== this.currentSection) {
      if (this.previousSection === 'Section 1' && this.currentSection === 'Section 2') {
        return 'right';
      } else if (this.previousSection === 'Section 2' && this.currentSection === 'Section 3') {
        return 'right';
      } else if (this.previousSection === 'Section 3' && this.currentSection === 'Section 2') {
        return 'left';
      } else if (this.previousSection === 'Section 2' && this.currentSection === 'Section 1') {
        return 'left';
      }
    }
    return null;
  }

  getAverageX(keypoints) {
    const relevantIndices = [0]; // 仅使用鼻子 (0)
    let totalX = 0;
    let count = 0;

    relevantIndices.forEach(index => {
      if (keypoints[index]) {
        totalX += this.kalmanFilters[index].filter(keypoints[index].x);
        count++;
      }
    });

    return count > 0 ? totalX / count : 0.5; // 如果没有关键点，默认返回中心
  }

  getAverageY() {
    const relevantIndices = [0, 11, 12]; // 使用鼻子、左髋部、右髋部
    let totalY = 0;
    let count = 0;

    this.previousKeypoints[this.previousKeypoints.length - 1].forEach((keypoint, index) => {
      if (relevantIndices.includes(index)) {
        totalY += this.kalmanFilters[index].filter(keypoint.y);
        count++;
      }
    });

    return count > 0 ? totalY / count : 0;
  }

  detectMovement() {
    if (this.previousKeypoints.length < this.timeWindow) return null;

    const currentAvgY = this.getAverageY();
    if (this.initialAvgY === null) {
      this.initialAvgY = currentAvgY;
      this.initialAvgYSet = true; // 设置标志位
      return null;
    }


    // 使用状态机检测垂直运动
    switch (this.verticalMovementState) {
      case 'idle':
        if (!this.initialAvgYSet) { // 检查标志位
          this.initialAvgY = currentAvgY;
          this.initialAvgYSet = true;
        }
        console.log(this.initialAvgY, currentAvgY);
        if (currentAvgY < this.initialAvgY - this.positionThreshold) {
          this.verticalMovementState = 'squatting';
          this.timeSinceLastChange = 0;
        } else if (currentAvgY > this.initialAvgY + this.jumpThreshold) {
          this.verticalMovementState = 'jumping';
          this.timeSinceLastChange = 0;
        }
        break;

      case 'squatting':
        if (currentAvgY > this.initialAvgY - this.positionThreshold) {
          this.verticalMovementState = 'standing';
        } else if (this.timeSinceLastChange > 1000) { // Check if 3 seconds have passed
          this.verticalMovementState = 'idle'; // Return to idle if too long in squatting without change
          this.initialAvgYSet = false; // 重置标志位
        }
        break;

      case 'standing':
        if (Math.abs(currentAvgY - this.initialAvgY) < this.positionThreshold) {
          this.verticalMovementState = 'idle';
          this.initialAvgYSet = false; // 重置标志位
          return 'down';
        } else if (this.timeSinceLastChange > 1000) { // Check if 3 seconds have passed
          this.verticalMovementState = 'idle'; // Return to idle if too long in squatting without change
          this.initialAvgYSet = false; // 重置标志位
        }
        break;

      case 'jumping':
        if (currentAvgY > this.initialAvgY) {
          this.verticalMovementState = 'jumping';
        } else if (this.timeSinceLastChange > 1000) { // Check if 3 seconds have passed
          this.verticalMovementState = 'idle'; // Return to idle if too long in squatting without change
          this.initialAvgYSet = false; // 重置标志位
        }
        break;
      
      case 'landing':
        if (Math.abs(currentAvgY - this.initialAvgY) < this.positionThreshold) {
          this.verticalMovementState = 'idle';
          this.initialAvgYSet = false; // 重置标志位
          return 'up';
        } else if (this.timeSinceLastChange > 1000) { // Check if 3 seconds have passed
          this.verticalMovementState = 'idle'; // Return to idle if too long in squatting without change
          this.initialAvgYSet = false; // 重置标志位
        }
        break;
    }
    this.timeSinceLastChange += 100;
    return null; // 确保左右和上下移动互不干扰
  }

  getCurrentSection() {
    return this.currentSection;
  }
}

export default PoseEstimation;
