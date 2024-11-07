import React, { useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import Slider from "react-slick";
import {
  useGetRecentJobsQuery,
  usePostSaveJobMutation,
  useDeleteSavedJobMutation,
  useGetCtcDataQuery,
  useGetSavedJobQuery,
} from "@/store/global-store/global.query";
import { RecentJobData } from "@/types/index";
import { formaterDate } from "@/utils/formateDate";
import { useDispatch } from "react-redux";
import { fetchRecentJobsStart } from "@/store/global-store/global.slice";
import { useRouter } from "next/navigation";
import { useLoggedInUser } from "@/hooks/useLoggedInUser";
import Loading from "@/components/Loading";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

const RecentJobSection = () => {
  const { data: recentJob, isLoading: recentJobLoading } = useGetRecentJobsQuery();
  const [saveJob] = usePostSaveJobMutation();
  const [deleteJob] = useDeleteSavedJobMutation();
  const dispatch = useDispatch();
  const { push } = useRouter();
  const { user } = useLoggedInUser();
  const { data: ctcData } = useGetCtcDataQuery();
  const { data: savedJob, refetch: savedJobRefetch } = useGetSavedJobQuery();

  const savedJobsMap = new Map(savedJob?.data?.map((job :any) => [job.id.toString(), true]));

  const getCtcTitleById = (id: any) => {
    const ctcItem = ctcData?.data?.find((item) => item.id == id);
    return ctcItem ? ctcItem.title : "N/A";
  };
  const handleLikeToggle = async (jobId :any) => {
    if (!user) {
      push("/login");
      return;
    }

    if (savedJobsMap.has(jobId)) {
      try {
        await deleteJob(jobId);
        await savedJobRefetch();
        dispatch(fetchRecentJobsStart());
        Swal.fire({
          icon: "success",
          title: "Job Deleted Successfully!",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error in Deleting Job",
          text: "Failed to delete job.",
          confirmButtonText: "OK",
        });
      }
    } else {
      try {
        await saveJob({ job_id: jobId });
        await savedJobRefetch();
        dispatch(fetchRecentJobsStart());
        Swal.fire({
          icon: "success",
          title: "Job Saved Successfully!",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error in Saving Job",
          text: "Failed to save job.",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const viewJobHandler = (id: number) => {
    push(`/job-detail?jobId=${id}`);
  };

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <>
      {recentJobLoading && <Loading />}
      <div className="section-full bg-white content-inner-2">
        <div className="container">
          <div className="d-flex job-title-bx section-head">
            <div className="mr-auto">
              <h2 className="m-b5" style={{ fontWeight: "501" }}>Recent Jobs</h2>
              <h6 className="fw4 m-b0">{recentJob?.data?.length}+ Recently Added Jobs</h6>
            </div>
            <div className="align-self-end">
              <Link href="/browse-jobs-grid" className="site-button button-sm">
                Browse All Jobs <i className="fa fa-long-arrow-right"></i>
              </Link>
            </div>
          </div>
          <Slider {...sliderSettings}>
            {recentJob?.data?.map((item: RecentJobData, index) => (
              <div key={index} className="p-3">
                <div style={{
                  padding: "20px",
                  backgroundColor: "#fff",
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)",
                  borderRadius: "12px",
                  minHeight: "300px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "0.3s",
                  position: "relative", // Position relative for like button
                }}>
                  <div>
                    <h4
                      className="text-secondary"
                      onClick={() => viewJobHandler(item.id)}
                      style={{ marginBottom: "10px" }}
                    >
                      {item.job_title}
                    </h4>
                    <ul style={{ listStyle: "none", padding: 0, fontSize: "14px", color: "#7f8c8d" }}>
                      <li><i className="fa fa-building mr-1" /> {item.company_name}</li>
                      <li><i className="fa fa-map-marker mr-1" /> {item.address}</li>
                      <li><i className="fa fa-clock-o mr-1" /> Published {formaterDate(item.created_at)}</li>
                    </ul>
                  </div>
                  <div className="job-time m-t15 m-b10">
                    {item.tags?.split(",").map((tag, index) => (
                      <Link key={index} href="#" className="mr-1">
                        <span className="tag">{tag.trim()}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="badge bg-primary text-white p-2">{item.location?.title || "Location"}</span>
                    <span className="badge bg-success text-white p-2"><i className="fa fa-money mr-1" />  {getCtcTitleById(item.ctc)}</span>
                  </div>
                  <div
                    className={`like-btn ${savedJobsMap.has(item.id.toString()) ? "liked" : ""}`}
                    onClick={() => handleLikeToggle(item.id.toString())}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      color: savedJobsMap.has(item.id.toString()) ? "#e74c3c" : "#bbb",
                      fontSize: "20px",
                      cursor: "pointer",
                      zIndex: 10, // Ensures it's on top of other elements
                    }}
                  >
                    <i className={`fa ${savedJobsMap.has(item.id.toString()) ? "fa-heart" : "fa-heart-o"}`} />
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </>
  );
};

export default RecentJobSection;
