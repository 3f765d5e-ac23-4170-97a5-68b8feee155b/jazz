import { CoID, Group, LocalNode, Media } from "cojson";

import ImageBlobReduce from "image-blob-reduce";
import Pica from "pica";
import {
    AutoSubContext,
    AutoSubExtension,
    createBinaryStreamFromBlob,
    readBlobFromBinaryStream,
    ResolvedGroup,
} from "jazz-browser";

const pica = new Pica();

export async function createImage(
    imageBlobOrFile: Blob | File,
    inGroup: Group | ResolvedGroup,
    maxSize?: 256 | 1024 | 2048
): Promise<Media.ImageDefinition> {
    let originalWidth!: number;
    let originalHeight!: number;
    const Reducer = new ImageBlobReduce({ pica });
    Reducer.after("_blob_to_image", (env) => {
        originalWidth =
            (env as unknown as { orientation: number }).orientation & 4
                ? env.image.height
                : env.image.width;
        originalHeight =
            (env as unknown as { orientation: number }).orientation & 4
                ? env.image.width
                : env.image.height;
        return Promise.resolve(env);
    });

    const placeholderDataURL = (
        await Reducer.toCanvas(imageBlobOrFile, { max: 8 })
    ).toDataURL("image/png");

    let imageDefinition = inGroup.createMap<Media.ImageDefinition>();

    imageDefinition = imageDefinition.edit((imageDefinition) => {
        imageDefinition.set("originalSize", [originalWidth, originalHeight]);
        imageDefinition.set("placeholderDataURL", placeholderDataURL);
    });

    setTimeout(async () => {
        const max256 = await Reducer.toBlob(imageBlobOrFile, { max: 256 });

        if (originalWidth > 256 || originalHeight > 256) {
            const width =
                originalWidth > originalHeight
                    ? 256
                    : Math.round(256 * (originalWidth / originalHeight));
            const height =
                originalHeight > originalWidth
                    ? 256
                    : Math.round(256 * (originalHeight / originalWidth));

            const binaryStreamId = (
                await createBinaryStreamFromBlob(max256, inGroup)
            ).id;

            imageDefinition.edit((imageDefinition) => {
                imageDefinition.set(`${width}x${height}`, binaryStreamId);
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 0));

        if (maxSize === 256) return;

        const max1024 = await Reducer.toBlob(imageBlobOrFile, { max: 1024 });

        if (originalWidth > 1024 || originalHeight > 1024) {
            const width =
                originalWidth > originalHeight
                    ? 1024
                    : Math.round(1024 * (originalWidth / originalHeight));
            const height =
                originalHeight > originalWidth
                    ? 1024
                    : Math.round(1024 * (originalHeight / originalWidth));

            const binaryStreamId = (
                await createBinaryStreamFromBlob(max1024, inGroup)
            ).id;

            imageDefinition.edit((imageDefinition) => {
                imageDefinition.set(`${width}x${height}`, binaryStreamId);
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 0));

        if (maxSize === 1024) return;

        const max2048 = await Reducer.toBlob(imageBlobOrFile, { max: 2048 });

        if (originalWidth > 2048 || originalHeight > 2048) {
            const width =
                originalWidth > originalHeight
                    ? 2048
                    : Math.round(2048 * (originalWidth / originalHeight));
            const height =
                originalHeight > originalWidth
                    ? 2048
                    : Math.round(2048 * (originalHeight / originalWidth));

            const binaryStreamId = (
                await createBinaryStreamFromBlob(max2048, inGroup)
            ).id;

            imageDefinition.edit((imageDefinition) => {
                imageDefinition.set(`${width}x${height}`, binaryStreamId);
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 0));

        if (maxSize === 2048) return;

        const originalBinaryStreamId = (
            await createBinaryStreamFromBlob(imageBlobOrFile, inGroup)
        ).id;

        imageDefinition.edit((imageDefinition) => {
            imageDefinition.set(
                `${originalWidth}x${originalHeight}`,
                originalBinaryStreamId
            );
        });
    }, 0);

    return imageDefinition;
}

export function BrowserImage(maxWidth?: number): AutoSubExtension<
    Media.ImageDefinition,
    LoadingImageInfo
> {
    return {
        id: "BrowserImage",

        subscribe(
            imageDef: Media.ImageDefinition,
            autoSubContext: AutoSubContext,
            callback: (update: LoadingImageInfo) => void
        ): () => void {
            return loadImage(imageDef, autoSubContext.node, callback, maxWidth);
        },
    }
}

export type LoadingImageInfo = {
    originalSize?: [number, number];
    placeholderDataURL?: string;
    highestResSrc?: string;
    highestResSrcOrPlaceholder?: string;
};

export function loadImage(
    imageDef:
        | CoID<Media.ImageDefinition>
        | Media.ImageDefinition
        | { id: CoID<Media.ImageDefinition> },
    localNode: LocalNode,
    progressiveCallback: (update: LoadingImageInfo) => void,
    maxWidth?: number,
): () => void {
    let unsubscribe: (() => void) | undefined;
    let stopped = false;

    const resState: {
        [res: `${number}x${number}`]:
            | { state: "queued" }
            | { state: "waiting" }
            | { state: "loading"; doneOrFailed: Promise<void> }
            | { state: "loaded"; blobURL: string }
            | { state: "revoked" }
            | { state: "failed" }
            | undefined;
    } = {};

    const cleanUp = () => {
        stopped = true;
        for (const [res, entry] of Object.entries(resState)) {
            if (entry?.state === "loaded") {
                resState[res as `${number}x${number}`] = { state: "revoked" };
                // prevent flashing from immediate revocation
                setTimeout(() => {
                    URL.revokeObjectURL(entry.blobURL);
                }, 3000);
            }
        }
        unsubscribe?.();
    };

    localNode
        .load(typeof imageDef === "string" ? imageDef : imageDef.id)
        .then((imageDefinition) => {
            if (stopped) return;
            if (imageDefinition === "unavailable") {
                console.warn(
                    "Image unavailable " +
                        (typeof imageDef === "string" ? imageDef : imageDef.id),
                    imageDef
                );
                cleanUp();
                return;
            }
            unsubscribe = imageDefinition.subscribe(async (imageDefinition) => {
                if (stopped) return;

                const originalSize = imageDefinition.get("originalSize");
                const placeholderDataURL =
                    imageDefinition.get("placeholderDataURL");

                const resolutions = imageDefinition
                    .keys()
                    .filter(
                        (key): key is `${number}x${number}` =>
                            !!key.match(/\d+x\d+/)
                    )
                    .filter((key) => {
                        return !maxWidth || Number(key.split("x")[0]) <= maxWidth;
                    })
                    .sort((a, b) => {
                        const widthA = Number(a.split("x")[0]);
                        const widthB = Number(b.split("x")[0]);
                        return widthA - widthB;
                    });

                const startLoading = async () => {
                    const notYetQueuedOrLoading = resolutions.filter(
                        (res) => !resState[res]
                    );

                    // console.log(
                    //     "Loading iteration",
                    //     resolutions,
                    //     resState,
                    //     notYetQueuedOrLoading
                    // );

                    for (const res of notYetQueuedOrLoading) {
                        resState[res] = { state: "queued" };
                    }

                    for (const res of notYetQueuedOrLoading) {
                        if (stopped) return;
                        resState[res] = { state: "waiting" };

                        const binaryStreamId = imageDefinition.get(res)!;
                        // console.log(
                        //     "Loading image res",
                        //     imageID,
                        //     res,
                        //     binaryStreamId
                        // );

                        await new Promise((resolve) => setTimeout(resolve, 2 * Number(res.split("x"))));

                        const binaryStream = await localNode.load(
                            binaryStreamId
                        );

                        if (stopped) return;
                        if (!binaryStream || binaryStream === "unavailable") {
                            resState[res] = { state: "failed" };
                            console.error(
                                "Loading image res failed",
                                imageDef,
                                res,
                                binaryStreamId,
                                binaryStream
                            );
                            return;
                        }

                        await new Promise<void>((resolveFullyLoaded) => {
                            const unsubFromStream = binaryStream.subscribe(
                                async (_) => {
                                    if (stopped) return;
                                    const currentState = resState[res];
                                    if (currentState?.state === "loading") {
                                        await currentState.doneOrFailed;
                                        // console.log(
                                        //     "Retrying image res after previous attempt",
                                        //     imageID,
                                        //     res,
                                        //     binaryStreamId
                                        // );
                                    }
                                    if (resState[res]?.state === "loaded") {
                                        return;
                                    }

                                    const doneOrFailed = new Promise<void>(
                                        // eslint-disable-next-line no-async-promise-executor
                                        async (resolveDoneOrFailed) => {
                                            const blob =
                                                await readBlobFromBinaryStream(
                                                    binaryStreamId,
                                                    localNode
                                                );

                                            if (stopped) return;
                                            if (!blob) {
                                                // console.log(
                                                //     "Image res not available yet",
                                                //     imageID,
                                                //     res,
                                                //     binaryStreamId
                                                // );
                                                resolveDoneOrFailed();
                                                return;
                                            }

                                            const blobURL =
                                                URL.createObjectURL(blob);
                                            resState[res] = {
                                                state: "loaded",
                                                blobURL,
                                            };

                                            // console.log(
                                            //     "Loaded image res",
                                            //     imageID,
                                            //     res,
                                            //     binaryStreamId
                                            // );

                                            progressiveCallback({
                                                originalSize,
                                                placeholderDataURL,
                                                highestResSrc: blobURL,
                                                highestResSrcOrPlaceholder:
                                                    blobURL,
                                            });

                                            unsubFromStream();
                                            resolveDoneOrFailed();

                                            await new Promise((resolve) =>
                                                setTimeout(resolve, 0)
                                            );

                                            resolveFullyLoaded();
                                        }
                                    );

                                    resState[res] = {
                                        state: "loading",
                                        doneOrFailed,
                                    };
                                }
                            );
                        });
                    }
                };

                if (
                    !Object.values(resState).some(
                        (entry) => entry?.state === "loaded"
                    )
                ) {
                    progressiveCallback({
                        originalSize,
                        placeholderDataURL,
                        highestResSrcOrPlaceholder: placeholderDataURL!,
                    });
                }

                startLoading().catch((err) => {
                    console.error("Error loading image", imageDef, err);
                    cleanUp();
                });
            });
        })
        .catch((err) => {
            console.error("Error loading image", imageDef, err);
            cleanUp();
        });

    return cleanUp;
}
