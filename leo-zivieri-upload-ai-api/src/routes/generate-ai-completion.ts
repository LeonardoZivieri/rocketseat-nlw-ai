import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { FastifyInstance } from "fastify";
import { OpenAIStream, streamToResponse } from "ai";
import { fastifyMultipart } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { openai } from "../lib/openai";


export async function generateAiCompletionRoute(app: FastifyInstance) {
    const bodySchema = z.object({
        videoId: z.string().uuid(),
        prompt: z.string(),
        temperature: z.number().min(0).max(1).default(0.5),
    });

    app.post('/ai/generate', async (req, res) => {
        const { videoId, prompt, temperature } = bodySchema.parse(req.body);

        const video = await prisma.video.findUniqueOrThrow({
            where: {
                id: videoId
            }
        });

        if (!video.transcription) {
            return res.status(400).send({
                error: 'Video transcription was not generated yet'
            })
        }

        const promptMessage = prompt.replace('{transcription}', video.transcription);

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: promptMessage }],
            temperature,
            stream: true,
        });

        const stream = OpenAIStream(response)

        streamToResponse(stream, res.raw, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        });
    })
}