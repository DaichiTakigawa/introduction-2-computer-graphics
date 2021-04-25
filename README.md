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

## メッシュのデータ構造

- off形式

  ```off
  OFF
  # cube.off
  # A cube
  
  8 6 12              <- 頂点数 面数 辺数
  1.0  0.0 1.4142     <- 0番目の頂点のxyz座標
  0.0  1.0 1.4142
  -1.0  0.0 1.4142
  0.0 -1.0 1.4142
  1.0  0.0 0.0
  0.0  1.0 0.0
  -1.0  0.0 0.0
  0.0 -1.0 0.0        <- 7番目の頂点のxyz座標
  4  0 1 2 3  255 0 0 #red <- 0番目の面の頂点数と頂点インデックスリス、optionalで面の色。
  4  7 4 0 3  0 255 0 #green
  4  4 5 1 0  0 0 255 #blue
  4  5 6 2 1  0 255 0 
  4  3 2 6 7  0 0 255
  4  6 5 4 7  255 0 0
  ```

- obj形式

  ```obj
  # List of geometric vertices, with (x, y, z [,w]) coordinates, w is optional and defaults to 1.0.
  v 0.123 0.234 0.345 1.0
  v ...
  ...
  # List of texture coordinates, in (u, [,v ,w]) coordinates, these will vary between 0 and 1. v, w are optional and default to 0.
  vt 0.500 1 [0]
  vt ...
  ...
  # List of vertex normals in (x,y,z) form; normals might not be unit vectors.
  vn 0.707 0.000 0.707
  vn ...
  ...
  # Parameter space vertices in ( u [,v] [,w] ) form; free form geometry statement ( see below )
  vp 0.310000 3.210000 2.100000
  vp ...
  ...
  # Polygonal face element (see below)
  f 1 2 3
  f 3/1 4/2 5/3
  f 6/4/1 3/5/3 7/6/5
  f 7//1 8//2 9//3
  f ...
  ...
  # Line element (see below)
  l 5 8 1 2 4 9
  ```

## ハーフエッジデータ構造

- 辺中心のデータ構造で頂点、辺、面のインシデンス情報を維持できる。

  ![halfedge](https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Dcel-halfedge-connectivity.svg/1280px-Dcel-halfedge-connectivity.svg.png)

- 頂点は、自分自身から出ていくハーフエッジを1つ保持する。
- エッジは、自分自身に重なるハーフエッジの2つの内1つを保持する。
- 面は、自身に接するハーフエッジを1つ保持する。
- ハーフエッジは、自分自身の先端の頂点を保持する。  
  ハーフエッジは、自分自身の反対側のハーフエッジを保持する。
  ハーフエッジは、自身の後ろのハーフエッジを保持する。
  ハーフエッジは、自身の前のハーフエッジを保持する。
  ハーフエッジは、自分自身に重なるエッジを保持する。
  ハーフエッジは、自身から左手に見る面を保持する。
  ハーフエッジは、自身の根元の頂点に関連する法線ベクトルを保持する。
  ハーフエッジは、自身の根元の頂点に関連するテクスチャ座標を保持する。

## legacygl

- begin関数  
  描画モードを設定。  
  ユニフォーム変数をセット。  
  頂点属性をリセット。  

- end関数  
  各頂点属性につて、バッファオブジェクトを作成し、データを流し込む。  
  設定された描画モードで描画する。  
  また、displist_nameが設定されていれば、displistに現在の描画情報(バッファ)を追加する。

- newList関数  
  新しいdisplistを作成する。  
  すでにある場合は、全てのdrawcallの全てのbufferを削除する。

- endList関数  
  current_displist_nameをnullに設定する。

- callList関数  
  指定した名前のdisplistがあれば、全てのdrawcallに対して描画を行う。
