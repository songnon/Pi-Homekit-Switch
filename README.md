# Pi-Homekit-Switch

Add 2 switches as Homekit accessories to reboot or shutdown a Raspberry Pi.

## Add as a systemd service

Add a file into `/lib/systemd/system/pihomekit.service` with the following. And change the `WorkingDirectory` to the directory where the source code is located.

```bash
Description=Node.js - Raspberry Pi Homekit Switches
Documentation=https://example.com
After=syslog.target network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/repo/Pi-Homekit
ExecStart=/usr/bin/node index.js  
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Run the following command to enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl start pihomekit
sudo systemctl status pihomekit
```

Use `journalctl` to check logs:

```bash
journalctl -u pihomekit -f
```