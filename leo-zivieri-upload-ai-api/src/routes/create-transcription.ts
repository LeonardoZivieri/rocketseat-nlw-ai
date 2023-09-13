import path from "node:path";
import fs from "node:fs";
import https from "node:https";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { openai } from "../lib/openai";


export async function createTranscriptionRoute(app: FastifyInstance) {
    const paramsSchema = z.object({
        videoId: z.string().uuid()
    });

    const bodySchema = z.object({
        prompt: z.string(),
    });

    app.post('/videos/:videoId/transcription', async (req) => {
        try {
            const { videoId } = paramsSchema.parse(req.params);

            const { prompt } = bodySchema.parse(req.body);

            const video = await prisma.video.findUniqueOrThrow({
                where: {
                    id: videoId
                }
            });

            if (video.transcription) {
                return video.transcription;
            }

            const videoPath = video.path;

            const audioReadStream = fs.createReadStream(videoPath);

            const response = await openai.audio.transcriptions.create({
                language: 'en',
                file: audioReadStream,
                model: 'whisper-1',
                response_format: "json",
                temperature: 0,
                prompt
            });

            const transcription = response.text

            await prisma.video.update({
                where: {
                    id: videoId,
                },
                data: {
                    transcription,
                }
            })

            return transcription
        } catch (error) {
            console.log(error);
            return error;
        }
    })
}