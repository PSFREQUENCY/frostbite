# syntax=docker/dockerfile:1
#
# One image for every service (ADR-009: build once, promote the same artifact). What a container does is chosen by the build
# target or the start command:
#   web      applies the pending migrations, then node apps/web/.next/standalone/apps/web/server.js   (target `web`, the default)
#   worker   pnpm --filter worker start                                                                (target `worker`)
#   release  pnpm --filter @frostbite/database migration:apply   (by hand, or a platform that wants a separate step)
# See docs/operations/deployment.md. Source maps of the browser code are not in the image either (the `sourcemaps` target sends them to the
# error provider, if wanted). Secrets are never in the image: they come from the platform's environment at run time.

ARG NODE_VERSION=24.11.1
# Set by the builder to the architecture being built for; read by the stage that picks the right release of the error provider's tool.
ARG TARGETARCH
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm COREPACK_HOME=/opt/corepack PATH=/pnpm:$PATH
WORKDIR /app
RUN corepack enable

# The error provider's command-line tool, for tagging the browser files (always) and uploading their maps (only when asked, see the
# `sourcemaps` target). It is fetched as a release binary with its checksum checked, not through the package manager: its npm package
# downloads the binary in an install script with no check, and this repository does not let install scripts run. It is in the build stages
# only; the image that runs does not have it. The checksums are from the release's own checksum files; a new version needs new ones.
ARG POSTHOG_CLI_VERSION=0.20.0
FROM base AS posthog-cli-amd64
ARG POSTHOG_CLI_VERSION
ADD --checksum=sha256:5417354c2faab32e377be178382d28e2e327ecce85858e3e05e905657986c9b9 \
    https://github.com/PostHog/posthog/releases/download/posthog-cli/v${POSTHOG_CLI_VERSION}/posthog-cli-x86_64-unknown-linux-gnu.tar.gz /tmp/posthog-cli.tar.gz
FROM base AS posthog-cli-arm64
ARG POSTHOG_CLI_VERSION
ADD --checksum=sha256:9d8b69251f8361916d27b27c694ecdb5336865c1e6cb6ef107334b8b5e66b22c \
    https://github.com/PostHog/posthog/releases/download/posthog-cli/v${POSTHOG_CLI_VERSION}/posthog-cli-aarch64-unknown-linux-gnu.tar.gz /tmp/posthog-cli.tar.gz
FROM posthog-cli-${TARGETARCH} AS posthog-cli
RUN mkdir /opt/posthog-cli \
 && tar -xzf /tmp/posthog-cli.tar.gz -C /opt/posthog-cli --strip-components=1 \
 && test -x /opt/posthog-cli/posthog-cli

FROM base AS compile
# ffmpeg draws the scene videos that browsers without a canvas play (tooling/scene-render).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*
COPY . .
# The package manager is the version the repository pins (package.json "packageManager"), fetched once here into COREPACK_HOME and copied
# to the final image, so a container never downloads anything when it starts (the release step runs pnpm).
RUN corepack install
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# An image carries only the released contract templates: the kept copies must equal contracts/templates/release.json. (They are not rebuilt
# here: the same source builds to different bytes in a different environment.)
RUN pnpm --filter @repo/repository-policy check:templates
RUN pnpm scenes:render
# The page is built with the settings of its two reports, because the browser has no environment to read them from: which provider each uses
# and its public project key (a key that only lets a page send in; it reads nothing, so it is not a secret and may sit in the image's
# history). Without them both reports are off. The test builds' robot setting is deliberately not here: no image people use may set it.
ARG NEXT_PUBLIC_ANALYTICS_PROVIDER
ARG NEXT_PUBLIC_ANALYTICS_TOKEN
ARG NEXT_PUBLIC_ERROR_REPORTING_PROVIDER
ARG NEXT_PUBLIC_ERROR_REPORTING_TOKEN
# The build makes the games (prebuild) and then the standalone server. It reads no secrets: configuration is validated when the server starts.
RUN pnpm --filter web build
# Tag every file the browser downloads with an id, so an error report can be turned back into our own source. This works offline and needs no
# secret: the tool wants its two variables to exist (the key in the shape of a personal API key) and is pointed at a local address that nothing
# listens on, so it can never reach anyone; no release is named here, because naming one makes it ask the provider about it. The id comes from
# the file's contents, so the same build always gets the same ids. The maps are uploaded, with the release, by the `sourcemaps` target below.
COPY --from=posthog-cli /opt/posthog-cli/posthog-cli /usr/local/bin/posthog-cli
RUN POSTHOG_CLI_HOST=http://127.0.0.1:1 POSTHOG_CLI_API_KEY=phx_unused POSTHOG_CLI_PROJECT_ID=0 \
    posthog-cli sourcemap inject --directory apps/web/.next/static

# Optional: `docker build --target sourcemaps --secret id=error_reporting_api_key,env=KEY --secret id=error_reporting_project_id,env=ID .`
# sends the maps of the browser files to the error provider, so the reports it gets are readable. It makes no image anyone runs, and a build
# without it loses nothing but the readable stacks. Secrets are given to this one command and are not kept in a layer.
FROM compile AS sourcemaps
ARG RELEASE_VERSION=unknown
ARG ERROR_REPORTING_UPLOAD_HOST=https://eu.posthog.com
# The tool makes a secure connection to the provider, which needs the certificates the base image does not carry.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN --mount=type=secret,id=error_reporting_api_key,required \
    --mount=type=secret,id=error_reporting_project_id,required \
    POSTHOG_CLI_HOST="${ERROR_REPORTING_UPLOAD_HOST}" \
    POSTHOG_CLI_API_KEY="$(cat /run/secrets/error_reporting_api_key)" \
    POSTHOG_CLI_PROJECT_ID="$(cat /run/secrets/error_reporting_project_id)" \
    posthog-cli sourcemap upload --directory apps/web/.next/static \
      --release-name frostbite --release-version "${RELEASE_VERSION}"

FROM compile AS build
# What the standalone server needs beside itself (the same copy `start:standalone` makes at start-up, made once here).
RUN rm -rf apps/web/.next/standalone/apps/web/.next/static apps/web/.next/standalone/apps/web/public \
 && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static \
 && cp -r apps/web/public apps/web/.next/standalone/apps/web/public \
 && rm -rf apps/web/.next/cache \
 && find apps/web/.next -name '*.map' -delete
# Drop what only building and testing need. `pnpm prune` cannot do this in a workspace (it empties each package's own node_modules), so the
# production install is repeated from the same lockfile; CI=true lets pnpm replace node_modules without a terminal to ask.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --frozen-lockfile --prod

FROM base AS runtime
# The licence of what is in the image, for anything that reads image labels; the repository policy checks it against LICENSE.
LABEL org.opencontainers.image.licenses="FSL-1.1-ALv2"
ENV NODE_ENV=production
# Where the platform reads game-rewards.wasm and milestone-collectible.wasm (the released ones, checked in the build). A deployment may set
# the variable to something else (or to nothing, which turns template publishing off); local runs and tests point it at their own build.
ENV REWARDS_TEMPLATES_DIR=/opt/templates
COPY --from=build /app/contracts/templates/released /opt/templates
COPY --from=build /opt/corepack /opt/corepack
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
# Next.js reads HOSTNAME to choose the address it listens on; the platform's router reaches the container on all of them.
ENV HOSTNAME=0.0.0.0 PORT=3000
# What a container does is chosen by the build target, so a platform that cannot override the start command (it only picks a Dockerfile and
# a target) still gets the right process. `web` is last, so it is what a build without a target makes. A start command given by the
# platform overrides either CMD.
FROM runtime AS worker
CMD ["pnpm", "--filter", "worker", "start"]

# The web container migrates before it serves: a migration that fails stops the container, so the previous version keeps serving. The
# migration takes a database lock, so several web containers starting together migrate once. The worker never migrates.
FROM runtime AS web
CMD ["sh", "-c", "pnpm --filter @frostbite/database migration:apply && exec node apps/web/.next/standalone/apps/web/server.js"]
