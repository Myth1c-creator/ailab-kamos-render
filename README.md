# ailab-kamos (render only)

AI LAB "Kámoš tomu uvěřil": 1080x1920, 60 fps, 13.433 s (806 frames). Rendered only in GitHub Actions. Code in plain text; the video frames,
the mix, the voice's word times, the song's grid and the captions are only in `assets.tar.gpg` (AES-256, key = the `ASSETS_KEY` secret).

    gh workflow run kinetic.yml -f res=540     # preview (half size, same checks)
    gh workflow run kinetic.yml -f res=1080    # final Full HD (no upscale step: the videos are 4K already)
