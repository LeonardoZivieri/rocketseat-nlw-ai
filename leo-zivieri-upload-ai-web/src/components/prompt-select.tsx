import { api } from "@/lib/axios";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { useEffect, useState } from "react";

interface Prompt {
    id: string;
    title: string;
    template: string;
}

interface PromptSelectProps {
    onPromptSelected: (template: string) => void
}

export function PromptSelect(props: PromptSelectProps) {

    const [prompts, setPrompts] = useState<Prompt[] | null>(null);

    useEffect(() => {
        api.get('/prompts').then(response => {
            setPrompts(response.data);
        })
    }, [])

    function handleOnSelected(promptId: string) {
        const selectedPrompt = prompts?.find(prompt => prompt.id == promptId);
        if (selectedPrompt) {
            props.onPromptSelected(selectedPrompt.template);
        }
    }


    return (
        <Select onValueChange={handleOnSelected}>
            <SelectTrigger>
                <SelectValue placeholder="Selecione um prompt..."></SelectValue>
            </SelectTrigger>
            <SelectContent>
                {prompts?.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.title}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}