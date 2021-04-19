# 2021 年度 コンピューターグラフィックス論

## シェーダー
- シェーダーには、ざっくりと頂点シェーダーとフラグメントシェーダーの2種類がある。
- javascriptから頂点データと汎用データを頂点シェーダーに送る。
- 汎用データはフラグメントシェーダーに直接送ることも可能。
- シェーダーを管理するのが、プログラムオブジェクト。
- VBO(vertex buffer object)について  
頂点シェーダーにデータを送り込む時に使うオブジェクト。
頂点の位置、属性、色情報等を格納する。
その他にも好きなデータを格納できる。
- attribute変数  
頂点属性に関するデータはattribute変数として宣言する。  
  ```GLSL
  attribute vec3 position;
  ```
- uniform変数
汎用的なデータを格納する変数。
  ```GLSL
  uniform mat4 mvpMatrix;
  ```
- varying変数
シェーダー間でデータのやり取りができる変数。
  ```GLSL
  // 頂点シェーダー
  varying vec4 vColor;
  // フラグメントシェーダーでも同じものを宣言する。
  varying vec4 vColor;
  ```
- シェーダで利用できる型として、vecとmatがある。  
vecとmat共に、vec2,vec3,...みたいに2~4までのサイズがあり、値の型はfloatのみ。
- 精度修飾子  
フラグメントシェーダーには精度修飾子なるものがある。  
lowp, mediump, highpの三つがあり、精度が高いほど負荷が大きい。
  ```GLSL
  // float型に対して精度を設定している。
  precision mediump float;
  ```
- GLSLの組み込み変数  
GLSLにはgl_で始まる様々なビルトイン変数が存在する。  
  - 頂点シェーダー限定の組み込み変数
    ```GLSL
    vec4 gl_Position //全ての変換を完了した頂点座標
    float gl_PointSize //頂点を点として描画する際の点の大きさ
    ```
  - フラグメンシェーダー限定の組み込み変数
    ```GLSL
    vec4 gl_FragCoord //入力専用、バッファ上の位置（ピクセル）
    vec4 gl_FragColor //出力専用、最終的にスクリーンに描かれる色
    ```
- IBO(index buffer object)  
インデックスバッファーでは、頂点をどのような順番で結ぶかを指定できる。
