import React, { useState } from 'react';
import { parse } from 'papaparse';
import { collection, doc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';

const Attendance = () => {
    const [file, setFile] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [meetingId, setMeetingId] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleMeetingIdChange = (e) => {
        setMeetingId(e.target.value);
    };

    const handleUpload = async () => {

        const meeting_id = "id_" + meetingId;
        if (!file) {
            alert('Please upload a CSV file first.');
            return;
        }
        if (!selectedCourse) {
            alert('Please select a course.');
            return;
        }
        if (!meetingId) {
            alert('Please enter a meeting ID.');
            return;
        }

        parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function (results) {
                const data = results.data;
                try {
                    for (const item of data) {
                        const participantId = item['Name (Original Name)']; // Update with your actual CSV header name
                        const participantData = item;

                        if (!participantId) {
                            console.error('Empty participantId found', item);
                            continue;
                        }

                        const participantRef = doc(collection(firestore, 'attendance', selectedCourse, meeting_id), participantId);
                        await setDoc(participantRef, participantData);
                    }
                    alert('Data successfully uploaded!');
                } catch (error) {
                    console.error('Error uploading data: ', error);
                    alert('Error uploading data.');
                }
            },
            error: function (error) {
                console.error('Error parsing CSV file: ', error);
                alert('Error parsing CSV file.');
            },
        });
    };

    return (
        <div className='dashboard'>
            <p>Attendance Upload</p>
            <input type="text" value={meetingId} onChange={handleMeetingIdChange} placeholder="Enter Meeting ID" />
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                <option value="" disabled>Select a course</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Video Editing">Video Editing</option>
                <option value="Web Development">Web Development</option>
            </select><br />
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload CSV</button>
        </div>
    );
};

export default Attendance;
