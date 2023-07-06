import axios from "axios";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_ROUTE = import.meta.env.VITE_API_ROUTE;

const CreateChannel = ({ isCreatingChannel, setIsCreatingChannel, userProfile, setTeamChannels }) => {
  const { wid } = useParams();
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const navigate = useNavigate();

  // const [invitedUsers, setInvitedUsers] = useState([]);

  useEffect(() => {
    const getWorkspaceMembers = async () => {
      const { data } = await axios.get(`${API_ROUTE}/chat/workspace/${wid}/members`);
      setWorkspaceMembers(data);
    };

    getWorkspaceMembers();
  }, []);

  const handleClose = () => {
    setIsCreatingChannel(false);
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    const formData = new FormData(evt.target);

    const { data } = await axios.post(`${API_ROUTE}/chat/workspace/${wid}/channel/new`, formData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    setIsCreatingChannel(false);
    setTeamChannels((prev) => [...prev, data]);
    navigate(`/workspace/${wid}/channel/${data._id}/room`);
  };

  return (
    <Dialog open={isCreatingChannel} onClose={setIsCreatingChannel} maxWidth={"sm"} fullWidth={true}>
      <DialogTitle>Create New Channel</DialogTitle>

      <DialogContent>
        <form id="createChannel" method="post" onSubmit={handleSubmit}>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="New Channel Name"
            type="text"
            fullWidth
            variant="standard"
            name="channelName"
            required
          />

          <h3 className="mt-3 text-xl">Invite Members</h3>
          <div className="h-full mt-3">
            {workspaceMembers.map((member) => (
              <div
                className={`flex items-center px-3 py-2 hover:bg-light-color-purple ${
                  member._id === userProfile._id ? "hidden" : ""
                }`}
                key={member._id}>
                <img className="h-10" src={API_ROUTE + member.avatarURL} alt="" />
                <label htmlFor={member._id} className="ml-3">
                  {member.username}
                </label>
                <input
                  className=" ml-auto w-4 h-4"
                  type="checkbox"
                  defaultChecked={member._id === userProfile._id}
                  name={member._id}
                  id={member._id}
                />
              </div>
            ))}
          </div>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="createChannel">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateChannel;
