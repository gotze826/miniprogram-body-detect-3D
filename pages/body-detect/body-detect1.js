// pages/body-detect/body-detect1.js
import getBehavior from './behavior';
import yuvBehavior from './yuvBehavior';
import KalmanFilter from './KalmanFilter'; 
import PoseEstimation from './pose-estimation';

const NEAR = 0.001;
const FAR = 1000;

const fs = wx.getFileSystemManager();
const filePath = `${wx.env.USER_DATA_PATH}/anchor2DList.txt`;

const kalmanFilters = {}; // 用于跟踪多个目标的卡尔曼滤波器
const poseEstimation = new PoseEstimation(); // 创建姿态估计实例
const app = getApp();

// 顶点着色器
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = 20.0; // 设置顶点大小为20.0
  }
`;

// 片元着色器
var FSHADER_SOURCE = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  varying vec4 v_Color;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
    if(d < 0.5) {
      gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
    } else { 
      discard; 
    }
  }
`;

// 初始化着色器函数
let initShadersDone = false;

function initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE) {
  var vertexShader = loadShader(gl, gl.VERTEX_SHADER, VSHADER_SOURCE);
  var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, FSHADER_SOURCE);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  var program = gl.createProgram();
  if (!program) {
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    var error = gl.getProgramInfoLog(program);
    console.log('程序对象连接失败: ' + error);
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    return null;
  }

  initShadersDone = true;
  return program;
}

function loadShader(gl, type, source) {
  var shader = gl.createShader(type);
  if (shader == null) {
    console.log('创建着色器失败');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    var error = gl.getShaderInfoLog(shader);
    console.log('编译着色器失败: ' + error);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

// 初始化顶点坐标和顶点颜色
function initVertexBuffers(gl, anchor2DList) {
  const flattenPoints = [];
  anchor2DList.forEach(anchor => {
    anchor.points.forEach(point => {
      const { x, y } = point;
      flattenPoints.push(x * 2 - 1, 1 - y * 2);
    });
  });

  var vertices = new Float32Array(flattenPoints);
  var n = flattenPoints.length / 2;

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  return n;
}

var EDGE_VSHADER_SOURCE = `
  attribute vec2 aPosition; 
  varying vec2 posJudge;

  void main(void) {
    gl_Position = vec4(aPosition.x, aPosition.y, 1.0, 1.0);
    posJudge = aPosition;
  }
`;

var EDGE_FSHADER_SOURCE = `
  precision highp float;
  uniform vec2 rightTopPoint;
  uniform vec2 centerPoint;
  varying vec2 posJudge;

  float box(float x, float y) {
    float xc = x - centerPoint.x;
    float yc = y - centerPoint.y;
    vec2 point = vec2(xc, yc);
    float right = rightTopPoint.x;
    float top = rightTopPoint.y;
    float line_width = 0.01;
    vec2 b1 = 1.0 - step(vec2(right, top), abs(point));
    float outer = b1.x * b1.y;
    vec2 b2 = 1.0 - step(vec2(right - line_width, top - line_width), abs(point));
    float inner = b2.x * b2.y;
    return outer - inner;
  }

  void main(void) {
    float isBox = box(posJudge.x, posJudge.y);
    if (isBox == 0.0) {
      discard;
    } else {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // 使用红色来画框
    }
  }
`;

function initRectEdgeBuffer(gl, x, y, width, height) {
  let shaderProgram = gl.program;
  let centerX = x * 2 - 1 + width;
  let centerY = -1 * (y * 2 - 1) - height;
  let right = width;
  let top = height;
  var vertices = [
    -1.0, 1.0,
    -1.0, -1.0,
    1.0, 1.0,
    1.0, -1.0
  ];

  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  var aPosition = gl.getAttribLocation(shaderProgram, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  var rightTop = [right, top];
  var rightTopLoc = gl.getUniformLocation(shaderProgram, 'rightTopPoint');
  gl.uniform2fv(rightTopLoc, rightTop);

  var centerPoint = [centerX, centerY];
  var centerPointLoc = gl.getUniformLocation(shaderProgram, 'centerPoint');
  gl.uniform2fv(centerPointLoc, centerPoint);

  var length = vertices.length / 2;
  return length;
}

function onDrawRectEdge(gl, x, y, width, height) {
  width = Math.round(width * 100) / 100;
  height = Math.round(height * 100) / 100;
  var n = initRectEdgeBuffer(gl, x, y, width, height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
}

Component({
  behaviors: [getBehavior(), yuvBehavior],
  data: {
    theme: 'light',
    smoothedX: 0,
    smoothedY: 0,
    currentTargetId: null,
    positiontext:'',
  },
  lifetimes: {
    detached() {
      initShadersDone = false;
      console.log("页面detached");
      if (wx.offThemeChange) {
        wx.offThemeChange();
      }
    },
    ready() {
      console.log("页面准备完全");
      this.setData({
        theme: wx.getSystemInfoSync().theme || 'light'
      });

      if (wx.onThemeChange) {
        wx.onThemeChange(({ theme }) => {
          this.setData({ theme });
        });
      }
    },
  },
  methods: {
    init() {
      this.initGL();
    },
    switchCamera(event) {
      if(this.session.config){
        const config = this.session.config;
        let pos = Number(event.currentTarget.dataset.value);
        config.cameraPosition = pos;
        this.session.config = config;
        this.setData({
          cameraPosition: event.currentTarget.dataset.value
        });
      }
    },
    initializeKalmanFilters(anchor2DList) {
      anchor2DList.forEach(anchor => {
        if (!kalmanFilters[anchor.id]) {
          kalmanFilters[anchor.id] = {
            x: new KalmanFilter(),
            y: new KalmanFilter(),
          };
        }
      });
    },
    updateKalmanFilters(anchor) {
      const kalman = kalmanFilters[anchor.id];
      if (kalman) {
        const smoothedX = kalman.x.filter(anchor.origin.x);
        const smoothedY = kalman.y.filter(anchor.origin.y);
        return { smoothedX, smoothedY };
      }
      return { smoothedX: anchor.origin.x, smoothedY: anchor.origin.y };
    },
    render(frame) {
      var gl = this.gl;
      this.renderGL(frame);

      const camera = frame.camera;

      if (camera) {
        this.camera.matrixAutoUpdate = false;
        this.camera.matrixWorldInverse.fromArray(camera.viewMatrix);
        this.camera.matrixWorld.getInverse(this.camera.matrixWorldInverse);

        const projectionMatrix = camera.getProjectionMatrix(NEAR, FAR);
        this.camera.projectionMatrix.fromArray(projectionMatrix);
        this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix);
      }

      this.renderer.autoClearColor = false;
      this.renderer.render(this.scene, this.camera);
      this.renderer.state.setCullFace(this.THREE.CullFaceNone);

      const anchor2DList = this.data.anchor2DList;

      if (!anchor2DList || anchor2DList.length <= 0) {
        return;
      } else {
        if (!initShadersDone) {
          this.vertexProgram = initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
          this.rectEdgeProgram = initShaders(gl, EDGE_VSHADER_SOURCE, EDGE_FSHADER_SOURCE);
          if (!this.vertexProgram || !this.rectEdgeProgram) {
            console.log('初始化着色器失败');
            return;
          }
          console.log('初始化着色器成功');
        }

        this.initializeKalmanFilters(anchor2DList);

        let currentTarget = null;
        let minDistance = Number.MAX_VALUE;
        anchor2DList.forEach(anchor => {
          if (this.data.currentTargetId === null || this.data.currentTargetId === anchor.id) {
            const { smoothedX, smoothedY } = this.updateKalmanFilters(anchor);
            const distance = Math.sqrt((smoothedX - anchor.origin.x) ** 2 + (smoothedY - anchor.origin.y) ** 2);
            if (distance < minDistance) {
              minDistance = distance;
              currentTarget = anchor;
            }
          }
        });

        if (currentTarget) {
          this.setData({ currentTargetId: currentTarget.id });
          gl.useProgram(this.vertexProgram);
          gl.program = this.vertexProgram;
          var n = initVertexBuffers(gl, [currentTarget]);
          gl.drawArrays(gl.POINTS, 0, n);

          gl.useProgram(this.rectEdgeProgram);
          gl.program = this.rectEdgeProgram;

          const { smoothedX, smoothedY } = this.updateKalmanFilters(currentTarget);
          onDrawRectEdge(gl, smoothedX, smoothedY, currentTarget.size.width, currentTarget.size.height);

          // 更新运动轨迹检测
          poseEstimation.updateData(currentTarget.points, currentTarget.origin);
          const movement = poseEstimation.detectMovement();
          if (movement) {
            this.setData({positiontext: movement});
            this.sendSocketMessage(movement);
          }
        }
      }
    },
      //发送消息函数
    sendSocketMessage(msg) {
      if (app.globalData.socketConnected) {
        var data1 = msg;
        if (app.globalData.user === 'left') {
          data1 = 'first:' + msg;
        } else {
          data1 = msg;
        }
        wx.sendSocketMessage({
          data: data1,
          success: () => {
            console.log('Message sent:', msg);
          },
          fail: (error) => {
            console.error('Failed to send message:', error);
          }
        })
      } else {
        console.log('cvvv');
      }
    },
  },
});
