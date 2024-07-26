"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "react-bootstrap";
import Swal from "sweetalert2";
import Link from "next/link";
import {
  useGetSingleEventByTitleMutation,
  useBuyPassForEventMutation,
  useGetUpComingEventsQuery,
  useGetPastEventsQuery,
} from "@/store/global-store/global.query";
import {
  useSaveEventMutation,
  useMyEventsQuery,
} from "@/app/my-resume/store/resume.query";
import { truncateText, formatEventDate } from "@/utils/formateDate";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import { useLoggedInUser } from "@/hooks/useLoggedInUser";

const SingleEvent = () => {
  const { user } = useLoggedInUser();
  const { push } = useRouter();
  const [clickedIndexes, setClickedIndexes] = useState<number[]>([]);
  const [activeButton, setActiveButton] = useState("upcoming");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [processingEventId, setProcessingEventId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const query = searchParams.get("query");
  const [
    getSingleEventByTitle,
    {
      data: singleEventByTitle,
      isLoading: singleEventByTitleLoading,
      isError,
      isSuccess,
      error,
    },
  ] = useGetSingleEventByTitleMutation();
  const [
    buyPassForEvent,
    { isLoading: isBuying, isError: isBuyError, error: buyError },
  ] = useBuyPassForEventMutation();
  const {
    data: upcomingEventsData,
    isLoading: isUpcomingLoading,
    isError: isUpcomingError,
  } = useGetUpComingEventsQuery();
  const {
    data: pastEventsData,
    isLoading: isPastLoading,
    isError: isPastError,
  } = useGetPastEventsQuery();
  const [saveEvent] = useSaveEventMutation();
  const { data: myEventsData } = useMyEventsQuery();

  useEffect(() => {
    if (query) {
      getSingleEventByTitle(query);
    }
  }, [getSingleEventByTitle, query]);

  useEffect(() => {
    if (singleEventByTitle?.data) {
      setSelectedEvent(singleEventByTitle.data);
    }
  }, [singleEventByTitle]);

  useEffect(() => {
    if (myEventsData?.data) {
      const savedEventIds = myEventsData.data.map((event: any) => event.event_id);
      const indexes = upcomingEventsData?.data?.reduce(
        (acc: number[], event: any, index: number) => {
          if (savedEventIds.includes(event.id)) {
            acc.push(index);
          }
          return acc;
        },
        []
      );
      setClickedIndexes(indexes || []);
    }
  }, [myEventsData, upcomingEventsData]);

  const handleButtonClick = (buttonType: string) => {
    setActiveButton(buttonType);
    setSelectedEvent(null); // Reset selected event when switching tabs
  };

  const handleToggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  const handleIconClick = async (event: any, index: number) => {
    const updatedIndexes = [...clickedIndexes];
    const currentIndex = updatedIndexes.indexOf(index);
    if (currentIndex === -1) {
      updatedIndexes.push(index);
    } else {
      updatedIndexes.splice(currentIndex, 1);
    }
    setClickedIndexes(updatedIndexes);

    const payload = {
      event_id: event?.id?.toString(),
      user_id: user?.user?.id?.toString(),
    };
    try {
      await saveEvent(payload).unwrap();
      Swal.fire("Saved!", "Event has been saved successfully.", "success");
    } catch (error: any) {
      Swal.fire("Error", `Failed to save the event: ${error?.message}`, "error");
    }
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
  };

  const isEventSaved = (eventId: number) => {
    return myEventsData?.data?.some((event: any) => event.event_id === eventId);
  };

  const description = selectedEvent?.description || "";
  const truncatedDescription = truncateText(description, 30);

  const handleBuyPass = async (event: any) => {
    setSelectedEvent(event);
    setProcessingEventId(event.id);
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to buy this pass?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2a6310",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, buy it!",
    });

    if (result.isConfirmed) {
      const event_id = event?.id.toString();
      const amount = event?.amount;

      if (event_id && amount) {
        try {
          const res = await buyPassForEvent({ event_id, amount }).unwrap();
          if (res) {
            Swal.fire("Purchased!", res?.message, "success");
          }
        } catch (error: any) {
          Swal.fire(
            "Error",
            `Failed to buy the pass: ${error?.message}`,
            "error"
          );
        }
      } else {
        Swal.fire("Error", "Event ID or amount is missing.", "error");
      }
    }
    setProcessingEventId(null);
  };

  const mapDescriptionWithIndex = (description: string) => {
    const paragraphs = description.split("</p><p>").map((para, index) => {
      return `<p>${index + 1}. ${para.replace(/<\/?p>/g, "")}</p>`;
    });
    return paragraphs.join("");
  };

  return (
    <>
      {(singleEventByTitleLoading || isUpcomingLoading || isPastLoading) && (
        <Loading />
      )}
      <div className="single-event-wrap bg-white">
        <div className="upcoming-past-title-wrap py-3 px-1">
          <Button
            className={activeButton === "upcoming" ? "active" : "shadow"}
            onClick={() => handleButtonClick("upcoming")}
            variant=""
          >
            Upcoming Meetups
          </Button>
          <Button
            className={activeButton === "past" ? "active" : "shadow"}
            onClick={() => handleButtonClick("past")}
            variant=""
          >
            Past Meetups
          </Button>
        </div>
        <hr />
        <div className="meetup-details-wrap py-2 d-flex">
          <div className="events-column col-md-8 d-flex flex-column gap-5 mb-5">
            {activeButton === "upcoming" &&
              upcomingEventsData?.data?.map((event: any, index: number) => (
                <div
                  className={`meetup-card shadow mb-3 ${
                    selectedEvent?.id === event.id ? "selected" : ""
                  }`}
                  key={index}
                  onClick={() => handleEventClick(event)}
                  style={{
                    padding: "1rem",
                    border: selectedEvent?.id === event.id ? "2px solid #2a6310" : "none",
                    backgroundColor: selectedEvent?.id === event.id ? "#f9f9f9" : "transparent",
                  }}
                >
                  <div className="event-chapter-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 onClick={() => handleEventClick(event)}>
                      <Link href={""} style={{ fontWeight: "600" }}>
                        {event.title}
                      </Link>
                    </h3>
                    <svg
                      className="savesvg"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 10 13"
                      fill="none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIconClick(event, index);
                      }}
                      style={{ width: "20px", height: "20px", cursor: "pointer" }}
                    >
                      <path
                        d="M0.5 0H9.5V12.5L5 10L0.5 12.5V0Z"
                        fill={isEventSaved(event.id) ? "#2A6310" : "#fff"}
                        stroke="#2A6310"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="fa fa-map-marker"></i>
                        <span>{event.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{formatEventDate(event.date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{event.time} Am onwards</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                      <Button variant="success">Details</Button>
                      <Button
                        variant="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPass(event);
                        }}
                        disabled={processingEventId === event.id}
                      >
                        {processingEventId === event.id ? "Processing..." : "Buy Pass"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            {activeButton === "past" &&
              pastEventsData?.data?.map((event: any, index: number) => (
                <div
                  className={`meetup-card shadow mb-3 ${
                    selectedEvent?.id === event.id ? "selected" : ""
                  }`}
                  key={index}
                  onClick={() => handleEventClick(event)}
                  style={{
                    padding: "1rem",
                    border: selectedEvent?.id === event.id ? "2px solid #2a6310" : "none",
                    backgroundColor: selectedEvent?.id === event.id ? "#f9f9f9" : "transparent",
                  }}
                >
                  <div className="event-chapter-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 onClick={() => handleEventClick(event)}>
                      <Link href={""} style={{ fontWeight: "600" }}>
                        {event.title}
                      </Link>
                    </h3>
                    <svg
                      className="savesvg"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 10 13"
                      fill="none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIconClick(event, index);
                      }}
                      style={{ width: "20px", height: "20px", cursor: "pointer" }}
                    >
                      <path
                        d="M0.5 0H9.5V12.5L5 10L0.5 12.5V0Z"
                        fill={isEventSaved(event.id) ? "#2A6310" : "#fff"}
                        stroke="#2A6310"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <i className="fa fa-map-marker"></i>
                        <span>{event.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{formatEventDate(event.date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{event.time} Am onwards</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                      <Button variant="success">Details</Button>
                      <Button
                        variant="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPass(event);
                        }}
                        disabled={processingEventId === event.id}
                      >
                        {processingEventId === event.id ? "Processing..." : "Buy Pass"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="col-md-4 py-2">
            {selectedEvent && (
              <div className="pass-detail-card shadow">
                <div className="pt-4 px-4">
                  <h5>
                    <strong>Pass Details</strong>
                  </h5>
                </div>
                <hr />
                <div className="event-chapter-title  px-4">
                  <h3>{selectedEvent?.title}</h3>
                </div>
                <div>
                  <div className="d-flex jd-header flex-wrap pl-4">
                    <div className="jd-loc-wrap">
                      <i className="fa fa-map-marker"></i>
                      <span>{selectedEvent?.location}</span>
                    </div>
                    <div className="jd-loc-wrap">
                      <span>{selectedEvent?.date}</span>
                    </div>
                    <div className="jd-loc-wrap">
                      <span>{selectedEvent?.time} Am onwards</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="pt-5 px-4">
                    <h6>
                      <strong>Details</strong>
                    </h6>
                    <div
                      className="d-para"
                      dangerouslySetInnerHTML={{
                        __html: showFullDescription
                          ? mapDescriptionWithIndex(description)
                          : truncatedDescription,
                      }}
                    ></div>
                    <Button
                      variant="link"
                      onClick={handleToggleDescription}
                      style={{
                        color: "#2a6310",
                        padding: "0",
                        textDecoration: "underline",
                      }}
                    >
                      {showFullDescription ? "Read Less" : "Read More"}
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="pt-5 px-4">
                    <h6>
                      <strong>Amount</strong>
                    </h6>
                    <strong className="price-tag">
                      &#8377; {selectedEvent?.amount}
                    </strong>
                  </div>
                </div>
                <div className="detail-bypass-title-wrap justify-content-center py-3" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                  <Button
                    variant="success"
                    onClick={() => handleBuyPass(selectedEvent)}
                    disabled={processingEventId === selectedEvent?.id}
                  >
                    {processingEventId === selectedEvent?.id ? "Processing..." : "Buy Pass"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SingleEvent;
