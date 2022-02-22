+++
title = "【Arch Linux】systemd-bootでXBOOTLDRを使ってみた"
slug = "LWnHhSN7"
description = "あまり知られていない、 systemd-boot の XBOOTLDR パーティションを使った設定方法を紹介します。 XBOOTLDR パーティションを使えば、 ESP パーティションのサイズが極端に小さい環境でも、 systemd-boot を設定することができます。"
+++

## 経緯

Windows と Arch Linux を systemd-boot でデュアルブートして使っていたのですが、先日 `pacman -Syu` を実行したら、エラーが出てパッケージの更新ができなくなってしまいました。エラーメッセージによると、 ESP パーティションの空き容量が足りず、 `linux` パッケージの更新ができないということでした。（何日か前に BIOS をアップデートしたときに、 BIOS をリカバリするためのファイル（？）が新しく生成されたのが原因ではないかと思っています。）

ESP パーティションを拡張することを検討したのですが、私の環境では ESP パーティションはディスク（正確には SSD ）の先頭にあって、そのすぐ後ろに Windows のパーティションがあるため、 ESP パーティションを拡張するためには Windows のパーティションの先頭位置を後ろにずらす必要があり、デュアルブートでそういうことをするのはリスキーな気がしたので、どうしたものかなーと思っていました。

GRUB などのブートローダーではカーネルイメージ（ `vmlinuz-linux` ）や initramfs （ `initramfs-linux.img` ）を ESP パーティションではなくルートパーティションに配置することができるので、こういった問題は起きにくいのかなと思うのですが、 systemd-boot では通常カーネルイメージを ESP パーティション内に配置するので、デュアルブートなどでパソコン出荷時に設定されたパーティショニングのまま使っている人は、こういう問題に直面することが結構あるのではないかと思いました。（私が使っているパソコンの ESP パーティションのサイズは、出荷時から100MiBに設定されていたので、カーネルイメージや initramfs を入れると結構ギリギリでした。）

これを機にブートローダーを GRUB に変えようかなとも思ったのですが、やっぱり systemd-boot のシンプルさが好きだったので、なんとかして systemd-boot のまま使える方法を探してみたところ、 **XBOOTLDR** パーティションを使うことでカーネルイメージや initramfs を ESP パーティションから分離できるということが分かったので、実際に使ってみました。

### XBOOTLDRとは

XBOOTLDR パーティションは、 ESP パーティションの亜種（？）みたいなもので、 systemd-boot では通常カーネルイメージや initramfs を ESP パーティション内に配置しなければならないところを、 XBOOTLDR パーティションに配置することができる（ ESP パーティションから分離させられる）というものです。 ESP パーティションのサイズが小さすぎてカーネルイメージや initramfs が入り切らないという場合に使うのが有効です。

XBOOTLDR パーティションを作るには、 ESP パーティションと同じディスク上にパーティションを作って FAT32 でフォーマットし、 PARTTYPE に `bc13c2ff-59e6-4262-a352-b275fd6f7172` を設定します。パーティションのサイズは、カーネルイメージや initramfs が十分に余裕を持って収まるように（500MiBくらい？）確保します。

## 作業手順

実際に私のパソコンの systemd-boot で XBOOTLDR パーティションを使うために行った作業を書きます。同じようなことをされる方は、必ずバックアップを取ってから作業してください。

### パーティションの準備

まずは XBOOTLDR パーティションを作成するための領域を確保しました。具体的には、ディスクの最後尾にあった Windows の回復パーティションを消し飛ばしました。 Windows の回復パーティションは今まで大事に残していたのですが、手元にリカバリ用の USB もあるし別に要らないかなって思って消しました。

XBOOTLDR パーティションは500MiB確保しました。あとは普通に FAT32 で初期化して、 PARTTYPE に `bc13c2ff-59e6-4262-a352-b275fd6f7172` を設定しました。

パーティションの操作は GParted のライブイメージを焼いた USB 使って行いました。 GUI があると楽ですよね…

PARTTYPE に `bc13c2ff-59e6-4262-a352-b275fd6f7172` を設定する方法ですが、 GParted では PARTTYPE を設定したいパーティションを右クリックして Manage Flags をクリックし、 `bls_boot` を選択することで可能です。なお、 PARTTYPE の GUID は `lsblk` コマンドの `-o` オプションで `PARTTYPE` を指定して `lsblk -o NAME,PARTTYPE` のような感じでコマンドを打って確認できます。

### systemd-boot の削除

次のコマンドで EFI パーティションから systemd-boot 関連のファイルを削除しました。

```
# bootctl remove
```

UEFI 変数とかの設定（？）も消えるみたいです。

個別の Linux 用のローダー設定ファイル（ `/boot/loader/entries/*.conf` ）は残ります。

### ファイルシステムのマウント

Arch Linux を起動して、 `/boot` にマウントしていた ESP パーティションを `/efi` にマウントし直し、代わりに XBOOTLDR パーティションを `/boot` にマウントしました。

次に、 `/etc/fstab` を編集して、次回以降起動したときに自動で現在の構成になるように設定しました。

[ArchWiki](https://wiki.archlinux.jp/index.php/Fstab) に fstab の書き方に関する詳しい情報があります。私の環境では次のようにしてみました。

```
# Static information about the filesystems.
# See fstab(5) for details.

# <file system>                           <dir>  <type> <options>    <dump> <pass>
UUID=0baf7dcb-8769-4513-9cfe-7cfd5dcd8acc  /      ext4   rw,relatime  0      1
UUID=8C01-72F2                             /efi   vfat   rw,relatime  0      2
UUID=1500-C54B                             /boot  vfat   rw,relatime  0      2
```

個人的に fstab では UUID を使う派です。

### ファイルの引っ越し

EFI パーティション（ `/efi` ）直下の `initramfs-linux-fallback.img`, `initramfs-linux.img`, `intel-ucode.img`, `vmlinuz-linux` の4つのファイルを XBOOTLDR パーティション（ `/boot` ）直下に移動させました。（ `intel-ucode.img` は CPU のマイクロコードで、CPUメーカーによって名前が違います。 [ArchWiki](https://wiki.archlinux.jp/index.php/%E3%83%9E%E3%82%A4%E3%82%AF%E3%83%AD%E3%82%B3%E3%83%BC%E3%83%89) にマイクロコードに関する詳しい情報があります。）

また、個別の Linux 用のローダー設定ファイル（ `/efi/loader/entries/*.conf` ）は EFI パーティションから、 XBOOTLDR パーティション内（ `/boot/loader/entries/*.conf` ）に移動させました。

### systemd-boot のインストール

次のコマンドで、 systemd-boot 関連のファイルを EFI パーティションと XBOOTLDR パーティションにインストールしました。

```
# bootctl --esp-path=/efi --boot-path=/boot install
```

### systemd-boot の設定

[ArchWiki](https://wiki.archlinux.jp/index.php/Systemd-boot#.E3.83.AD.E3.83.BC.E3.83.80.E3.83.BC.E8.A8.AD.E5.AE.9A) を参考に systemd-boot 関連の設定ファイルを作成・編集しました。私の環境での設定を紹介します。

`/efi/loader/loader.conf` は次のようにしました。 **EFI パーティション（ `/efi` ）内**に配置しています。

```
default arch
timeout 3
editor no
```

- `default` ：デフォルトで選択されるエントリ
- `timeout` ：デフォルトエントリが起動するまでの時間（秒）
- `editor` ：カーネルパラメータの編集を許可するか（ `yes` にすると誰でも簡単に root 権限を取得できてしまうので `no` が推奨）

`/boot/loader/entries/arch.conf` は次のようにしました。 **XBOOTLDR パーティション（ `/boot` ）内**に配置しています。

```
title   Arch Linux
linux   /vmlinuz-linux
initrd  /intel-ucode.img
initrd  /initramfs-linux.img
options root=UUID=e4a4ca48-722b-44a0-9c7b-f745c0d0209d rw
```

- `title` ：ブートメニューに表示する名前
- `linux` ：カーネルイメージのパス
- `initrd` ： CPU のマイクロコードと initramfs のパス（ CPU のマイクロコードを上に書く。）
- `options` ：カーネルパラメータ

`linux` と `initrd` は `/boot` を root とする絶対パスで指定します。


### 確認

systemd-boot が正しく設定されているか、次の2つのコマンドを使って確認しました。

```
$ bootctl status
```

```
$ bootctl list
```

確認が終わったら、パソコンを再起動しました。カーネルイメージや initramfs を ESP パーティションから分離しつつ、 systemd-boot を使って無事に Windows と ArchLinux のデュアルブート環境を構成することができていました。

## 感想

XBOOTLDR パーティションは聞いたこともなかったので、うまく動作するか不安でしたが、意外とすんなり使うことができたので驚きました。 Windows とデュアルブートしている関係で、 ESP パーティションにカーネルイメージや initramfs が入り切らないという人にとっては、とても重宝する機能だと思いました。

## 参考にしたページ

- [systemd-boot - ArchWiki](https://wiki.archlinux.jp/index.php/Systemd-boot)
- [Systemd-Boot Installation XBOOTLDR / Forum &amp; Wiki discussion / Arch Linux Forums](https://bbs.archlinux.org/viewtopic.php?id=254374)
- [Boot Loader Specification](https://systemd.io/BOOT_LOADER_SPECIFICATION/)
