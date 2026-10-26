        if (action === "transfer") {
          try {
            const newOwnerWallet = await transferSigner.getAddress();
            const newOwnerName = (purchasers || []).find((f) => f.walletAddress?.toLowerCase() === newOwnerWallet.toLowerCase())?.fullName || shortAddress(newOwnerWallet);
            const existingMeta = (landRequests || []).find((r) => String(r.landId) === String(form.landId));
            const transferPayload = {
              newOwnerWallet,
              newOwnerName,
              surveyNumber: existingMeta?.surveyNumber || targetLand?.survey || form.survey || "12/3A",
              village: existingMeta?.village || targetLand?.location?.split(",")[0] || form.village || "Jakkur",
              hobli: existingMeta?.hobli || targetLand?.location?.split(",")[1] || form.hobli || "Yelahanka",
              taluk: existingMeta?.taluk || targetLand?.location?.split(",")[2] || form.taluk || "Bengaluru North",
              district: existingMeta?.district || targetLand?.location?.split(",")[3] || form.district || "Bengaluru Urban",
              extent: existingMeta?.extent || targetLand?.area || form.area || "48"
            };
            await api(`/api/land-requests/transfer-owner/${form.landId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(transferPayload)
            });
            const savedOwned = JSON.parse(localStorage.getItem("bhoomi_transferred_lands") || "[]");
            if (!savedOwned.includes(String(form.landId))) {
              savedOwned.push(String(form.landId));
              localStorage.setItem("bhoomi_transferred_lands", JSON.stringify(savedOwned));
            }
            await refreshAppData();
          } catch (e) {
            console.warn("Transfer owner sync skipped:", e.message);
          }
        }
