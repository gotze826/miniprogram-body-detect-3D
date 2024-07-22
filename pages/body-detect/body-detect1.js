// pages/body-detect/body-detect1.js
<<<<<<< HEAD
import getBehavior from './behavior'
import yuvBehavior from './yuvBehavior'

const NEAR = 0.001
const FAR = 1000

//顶点着色器
var VSHADER_SOURCE = '' +
  'attribute vec4 a_Position;\n' + //声明attribute变量a_Position，用来存放顶点位置信息
  'void main(){\n' +
  '  gl_Position = a_Position;\n' + //将顶点坐标赋值给顶点着色器内置变量gl_Position
  '  gl_PointSize = 4.0;\n' + //设置顶点大小
  '}\n'

//片元着色器
var FSHADER_SOURCE = '' +
  '#ifdef GL_ES\n' +
  ' precision mediump float;\n' + // 设置精度
  '#endif\n' +
  'varying vec4 v_Color;\n' + //声明varying变量v_Color，用来接收顶点着色器传送的片元颜色信息
  'void main(){\n' +
  '  float d = distance(gl_PointCoord, vec2(0.5, 0.5));\n' + //计算像素距离中心点的距离
  '  if(d < 0.5) {\n' + //距离大于0.5放弃片元，小于0.5保留片元
  '    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);\n' +
  '  } else { discard; }\n' +
  '}\n'


//初始化着色器函数
let initShadersDone = false

function initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE) {
  //创建顶点着色器对象
  var vertexShader = loadShader(gl, gl.VERTEX_SHADER, VSHADER_SOURCE)
  //创建片元着色器对象
  var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, FSHADER_SOURCE)

  if (!vertexShader || !fragmentShader) {
    return null
  }

  //创建程序对象program
  var program = gl.createProgram()
  if (!gl.createProgram()) {
    return null
  }
  //分配顶点着色器和片元着色器到program
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  //链接program
  gl.linkProgram(program)

  //检查程序对象是否连接成功
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!linked) {
    var error = gl.getProgramInfoLog(program)
    console.log('程序对象连接失败: ' + error)
    gl.deleteProgram(program)
    gl.deleteShader(fragmentShader)
    gl.deleteShader(vertexShader)
    return null
  }
  //返回程序program对象
  initShadersDone = true
  return program
}

function loadShader(gl, type, source) {
  // 创建顶点着色器对象
  var shader = gl.createShader(type)
  if (shader == null) {
    console.log('创建着色器失败')
    return null
  }

  // 引入着色器源代码
  gl.shaderSource(shader, source)

  // 编译着色器
  gl.compileShader(shader)

  // 检查顶是否编译成功
  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!compiled) {
    var error = gl.getShaderInfoLog(shader)
    console.log('编译着色器失败: ' + error)
    gl.deleteShader(shader)
    return null
  }

  return shader
}

//初始化顶点坐标和顶点颜色
function initVertexBuffers(gl, anchor2DList) {

  const flattenPoints = []
  anchor2DList.forEach(anchor => {
    anchor.points.forEach(point => {
      const {
        x,
        y
      } = point
      flattenPoints.push(x * 2 - 1, 1 - y * 2)
    })
  })

  var vertices = new Float32Array(flattenPoints)
  var n = flattenPoints.length / 2

  //创建缓冲区对象
  var buffer = gl.createBuffer()
  //将顶点坐标和顶点颜色信息写入缓冲区对象
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  //获取顶点着色器attribute变量a_Position存储地址, 分配缓存并开启
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position')
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(a_Position)
  return n
}

var EDGE_VSHADER_SOURCE =
  `
=======
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
>>>>>>> ae7529d (add model)
  attribute vec2 aPosition; 
  varying vec2 posJudge;

  void main(void) {
    gl_Position = vec4(aPosition.x, aPosition.y, 1.0, 1.0);
    posJudge = aPosition;
  }
<<<<<<< HEAD
`

var EDGE_FSHADER_SOURCE =
  `
=======
`;

var EDGE_FSHADER_SOURCE = `
>>>>>>> ae7529d (add model)
  precision highp float;
  uniform vec2 rightTopPoint;
  uniform vec2 centerPoint;
  varying vec2 posJudge;

<<<<<<< HEAD
  float box(float x, float y){
=======
  float box(float x, float y) {
>>>>>>> ae7529d (add model)
    float xc = x - centerPoint.x;
    float yc = y - centerPoint.y;
    vec2 point = vec2(xc, yc);
    float right = rightTopPoint.x;
<<<<<<< HEAD
    float top =  rightTopPoint.y;
    float line_width = 0.01;
    vec2 b1 = 1.0 - step(vec2(right,top), abs(point));
    float outer = b1.x * b1.y;
    vec2 b2 = 1.0 - step(vec2(right-line_width,top-line_width), abs(point));
=======
    float top = rightTopPoint.y;
    float line_width = 0.01;
    vec2 b1 = 1.0 - step(vec2(right, top), abs(point));
    float outer = b1.x * b1.y;
    vec2 b2 = 1.0 - step(vec2(right - line_width, top - line_width), abs(point));
>>>>>>> ae7529d (add model)
    float inner = b2.x * b2.y;
    return outer - inner;
  }

  void main(void) {
<<<<<<< HEAD
      if(box(posJudge.x, posJudge.y) == 0.0 ) discard;

      gl_FragColor = vec4(box(posJudge.x, posJudge.y), 0.0, 0.0, 1.0);

  }
`
=======
    float isBox = box(posJudge.x, posJudge.y);
    if (isBox == 0.0) {
      discard;
    } else {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // 使用红色来画框
    }
  }
`;
>>>>>>> ae7529d (add model)

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

<<<<<<< HEAD

  var rightTop = [
    right, top
  ];
  var rightTopLoc = gl.getUniformLocation(shaderProgram, 'rightTopPoint');
  gl.uniform2fv(rightTopLoc, rightTop);

  var centerPoint = [
    centerX, centerY
  ];
=======
  var rightTop = [right, top];
  var rightTopLoc = gl.getUniformLocation(shaderProgram, 'rightTopPoint');
  gl.uniform2fv(rightTopLoc, rightTop);

  var centerPoint = [centerX, centerY];
>>>>>>> ae7529d (add model)
  var centerPointLoc = gl.getUniformLocation(shaderProgram, 'centerPoint');
  gl.uniform2fv(centerPointLoc, centerPoint);

  var length = vertices.length / 2;
<<<<<<< HEAD

=======
>>>>>>> ae7529d (add model)
  return length;
}

function onDrawRectEdge(gl, x, y, width, height) {
<<<<<<< HEAD
  width = Math.round(width * 100) / 100
  height = Math.round(height * 100) / 100
=======
  width = Math.round(width * 100) / 100;
  height = Math.round(height * 100) / 100;
>>>>>>> ae7529d (add model)
  var n = initRectEdgeBuffer(gl, x, y, width, height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
}

Component({
  behaviors: [getBehavior(), yuvBehavior],
  data: {
    theme: 'light',
<<<<<<< HEAD
  },
  lifetimes: {
    /**
     * 生命周期函数--监听页面加载
     */
    detached() {
      initShadersDone = false
      console.log("页面detached")
      if (wx.offThemeChange) {
        wx.offThemeChange()
      }
    },
    ready() {
      console.log("页面准备完全")
      this.setData({
        theme: wx.getSystemInfoSync().theme || 'light'
      })

      if (wx.onThemeChange) {
        wx.onThemeChange(({
          theme
        }) => {
          this.setData({
            theme
          })
        })
=======
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
>>>>>>> ae7529d (add model)
      }
    },
  },
  methods: {
    init() {
<<<<<<< HEAD
      this.initGL()
    },
    switchCamera(event){
      if(this.session.config){
        const config = this.session.config
        let pos = Number(event.currentTarget.dataset.value)
        config.cameraPosition = pos
        this.session.config = config
        this.setData({
          cameraPosition:event.currentTarget.dataset.value
        })
      }
    },
    render(frame) {
      var gl = this.gl

      this.renderGL(frame)

      const camera = frame.camera

      // 相机
      if (camera) {
        this.camera.matrixAutoUpdate = false
        this.camera.matrixWorldInverse.fromArray(camera.viewMatrix)
        this.camera.matrixWorld.getInverse(this.camera.matrixWorldInverse)

        const projectionMatrix = camera.getProjectionMatrix(NEAR, FAR)
        this.camera.projectionMatrix.fromArray(projectionMatrix)
        this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix)
      }

      this.renderer.autoClearColor = false
      this.renderer.render(this.scene, this.camera)
      this.renderer.state.setCullFace(this.THREE.CullFaceNone)

      const anchor2DList = this.data.anchor2DList

      if (!anchor2DList || anchor2DList.length <= 0) {
        return
      } else {
        if (!initShadersDone) {
          this.vertexProgram = initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)
          this.rectEdgeProgram = initShaders(gl, EDGE_VSHADER_SOURCE, EDGE_FSHADER_SOURCE)
          if (!this.vertexProgram || !this.rectEdgeProgram) {
            console.log('初始化着色器失败')
            return
          }
          console.log('初始化着色器成功')
        }

        gl.useProgram(this.vertexProgram)
        gl.program = this.vertexProgram
        //初始化顶点坐标和顶点颜色
        var n = initVertexBuffers(gl, anchor2DList)

        //绘制点
        gl.drawArrays(gl.POINTS, 0, n)

        gl.useProgram(this.rectEdgeProgram)
        gl.program = this.rectEdgeProgram

        for (var i = 0; i < anchor2DList.length; i++) {
          onDrawRectEdge(gl, anchor2DList[i].origin.x, anchor2DList[i].origin.y, anchor2DList[i].size.width, anchor2DList[i].size.height)
        }
      }
    },
  },
})
=======
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
>>>>>>> ae7529d (add model)
