import { FileVideo, Upload, Check, Loader } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type VideoUploadStatus = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success';

const statusMessages: Record<VideoUploadStatus, string> = {
    waiting: "Carregar vídeo",
    converting: "Convertendo...",
    uploading: "Transcrevendo...",
    generating: "Carregando...",
    success: "Sucesso!",
}

interface VideoInputFormProps {
    onVideoUploaded: (id: string) => void
}

export function VideoInputForm(props: VideoInputFormProps) {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [status, setStatus] = useState<VideoUploadStatus>('waiting');
    const promptInputRef = useRef<HTMLTextAreaElement>(null);

    function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
        const { files } = event.currentTarget;
        if (!files || !files[0]) {
            return;
        }
        const selectedFile = files[0];
        setVideoFile(selectedFile)
    }

    async function convertVideoToAudio(video: File) {
        console.log("Convert started.");

        const ffmpeg = await getFFmpeg();

        await ffmpeg.writeFile('input.mp4', await fetchFile(video));

        // ffmpeg.on("log", (log) => console.log(log))

        ffmpeg.on("progress", progress => {
            console.log("Convert progress: ", Math.round(progress.progress * 100))
        })

        await ffmpeg.exec([
            "-i",
            "input.mp4",
            "-map",
            "0:a",
            "-b:a",
            "20k",
            "-acodec",
            "libmp3lame",
            "output.mp3",
        ]);

        const data = await ffmpeg.readFile("output.mp3");

        const audioFileBlob = new Blob([data], { type: 'audio/mpeg' });
        const audioFile = new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg',
        });

        console.log("Convert finished");

        return audioFile;
    }

    async function handleUploadVideo(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const prompt = promptInputRef.current?.value;

        if (!videoFile) {
            return;
        }

        setStatus('converting');

        const audioFile = await convertVideoToAudio(videoFile);

        setStatus('uploading');

        const data = new FormData();
        data.append('file', audioFile);
        const response = await api.post("/videos", data);

        const videoId = response.data.video.id;

        setStatus('generating');

        await api.post(`/videos/${videoId}/transcription`, { prompt });

        setStatus('success');

        props.onVideoUploaded(videoId);

        console.log("finalizou");
    }

    const previewUrl = useMemo(() => {
        if (!videoFile) {
            return null;
        }
        return URL.createObjectURL(videoFile);
    }, [videoFile]);

    return (
        <form onSubmit={handleUploadVideo} className="space-y-6">
            <label
                htmlFor="video"
                className="border flex relative rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
            >
                {previewUrl !== null ? (
                    <video src={previewUrl} controls={false} className="pointer-events-none absolute inset-0" />
                ) : (
                    <>
                        <FileVideo className="w-6 h-6"></FileVideo>
                        Selecione um vídeo
                    </>
                )}
            </label>
            <input
                disabled={status !== 'waiting'}
                type="file"
                id="video"
                accept="video/mp4"
                className="sr-only"
                onChange={handleFileSelected}
            />

            <Separator />

            <div className="space-y-2">
                <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
                <Textarea
                    ref={promptInputRef}
                    disabled={status !== 'waiting'}
                    id="transcription_prompt"
                    className="h-20 resize-none leading-relaxed"
                    placeholder="Inclua palavas-chave mencionadas no vídeo separadas por vírgula (,)"
                />
            </div>

            <Button
                data-success={status === "success"}
                disabled={status !== 'waiting'}
                type="submit"
                className="w-full data-[success=true]:bg-emerald-400"
            >
                {statusMessages[status]}
                {status === 'waiting' ? (
                    <Upload className="w-4 h-4 ml-2" />
                ) : (
                    status === "success" ? (
                        <Check className="w-4 h-4 ml-2" />
                    ) : (
                        <Loader className="w-4 h-4 ml-2" />
                    )
                )}
            </Button>
        </form>
    )
}
