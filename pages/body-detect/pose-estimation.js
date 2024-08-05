import KalmanFilter from './KalmanFilter';

class PoseEstimation {
  constructor() {
    this.previousKeypoints = [];
    this.positionThreshold = 0.05; // 下蹲和跳起的阈值
    this.windowSize = 10; // 窗口大小
    this.kalmanFilters = {
      0: new KalmanFilter(), // 鼻子
      6: new KalmanFilter(), // 左髋部
      5: new KalmanFilter(), // 右髋部
    };
    this.verticalMovementState = 'idle';
    this.initialY = null;
    this.initialTime = null;
    this.actionlock = '';
    this.downTime = null;
  }

  updateData(keypoints, sections) {
    // 添加当前关键点到窗口中
    this.previousKeypoints.push(keypoints);

    // 当窗口超过指定大小时，移除最旧的数据
    if (this.previousKeypoints.length > this.windowSize) {
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
    const relevantIndices = [0, 5, 6]; // 使用鼻子、左髋部、右髋部
    let totalY = 0;
    let count = 0;

    this.previousKeypoints.forEach(frame => {
      relevantIndices.forEach(index => {
        if (frame[index]) {
          totalY += this.kalmanFilters[index].filter(frame[index].y);
          count++;
        }
      });
    });

    return count > 0 ? totalY / count : 0;
  }
  

  
  getAverageYForFrame(index) {
    const relevantIndices = [0, 5, 6]; // 使用鼻子、左髋部、右髋部
    let totalY = 0;
    let count = 0;

    this.previousKeypoints[index].forEach((keypoint, i) => {
      if (relevantIndices.includes(i)) {
        totalY += this.kalmanFilters[i].filter(keypoint.y);
        count++;
      }
    });

    return count > 0 ? totalY / count : 0;
  }

  detectMovement() {
    // 如果窗口内的帧数量不足，则不进行检测
    if (this.previousKeypoints.length < this.windowSize) return null;

    // 获取窗口内的初始和最终平均Y值
    const firstAvgY = this.getAverageYForFrame(0);
    const lastAvgY = this.getAverageYForFrame(this.previousKeypoints.length - 1);
    const avgY = this.getAverageY();

    const currentTime = Date.now();

    if (this.verticalMovementState === 'idle') {
      if (firstAvgY - lastAvgY > this.positionThreshold) {
        this.verticalMovementState = 'down_detected';
        this.initialY =  (firstAvgY + lastAvgY) / 2;
        this.initialTime = currentTime;
        this.actionlock = '';
        console.log('检测到下蹲开始');
      }
      if (this.actionlock) {
        const temp = this.actionlock;
        this.actionlock = '';
        return temp;
      }
    }

    if (this.verticalMovementState === 'down_detected') {
      const timeElapsed = (currentTime - this.initialTime) / 1000; // 秒
      const yDifference = avgY - this.initialY;
      console.log(yDifference);

      if (timeElapsed < 2) {
        if (yDifference > this.positionThreshold / 2) {
          console.log('检测到跳跃');
          this.actionlock = 'up';
        } else if (yDifference < -this.positionThreshold / 2) {
          console.log('检测到下蹲');
          if(this.actionlock !== 'up') {
             this.actionlock = 'down';
          }
        }
      } else {
        // 超过时间未检测到进一步动作，重置状态
        this.verticalMovementState = 'idle';
      }
    }

    return null; // 确保左右和上下移动互不干扰
  }

  getCurrentSection() {
    return this.currentSection;
  }
}

export default PoseEstimation;
