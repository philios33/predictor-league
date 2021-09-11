
import React, { useEffect, useRef, useState } from 'react';
// import lamejs from 'lamejs';

function RecordAudio() {

    // 1. Show record button first with mic media dropdown
    // 2. User presses record and a timer starts counting up from 00:00, stop button shows
    // 3. "Preview audio" with audio element, show "Discard" or "Submit"
    // 4. "Uploading..." with progress bar, show "Success" for 500ms, then...
    // 5. Show "Play my hot tip" or "Delete my hot tip"

    let recorder: null | MediaRecorder = null;
    let audioData: Array<Blob> = [];

    const handleSuccess = (stream: MediaStream) => {
        recorder = new MediaRecorder(stream);

        recorder.addEventListener('dataavailable', async ({ data }) => {
            audioData.push(data);
        });

        const getBase64 = async (data: Array<Blob>) : Promise<string | ArrayBuffer | null> => {
            return await new Promise((r) => {
                const reader = new FileReader()
                reader.onload = () => {
                    let allData = reader.result as string;
                    let b64Data = allData.split(",")[1];
                    let newOutput = "data:audio/webm;base64," + b64Data
                    r(newOutput)
                }
                reader.readAsDataURL(new Blob(data))
            });
        }

        recorder.addEventListener('stop', async function() {
            if (player.current) {
                player.current.src = await getBase64(audioData) as string;
            }
        });

        recorder.start();
    }

    const startClicked = (e: React.MouseEvent) => {
        audioData = [];
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(handleSuccess);
    }

    const stopClicked = (e: React.MouseEvent) => {
        if (recorder !== null) {
            recorder.stop();
        }
    }

    const player = useRef<HTMLAudioElement>(null);

    return (
        <div>
            <input type="file" accept="audio/*" capture></input>
            <button onClick={(e) => startClicked(e)}>Start</button>
            <button onClick={(e) => stopClicked(e)}>Stop</button>
            <hr />
            <audio ref={player} controls></audio>
        </div>
    )
}

export default RecordAudio;